use crate::models::error::AppError;
use crate::models::token::{StoredToken, TokenPurpose};
use bcrypt::{hash, verify, DEFAULT_COST};
use futures::stream::TryStreamExt;
use log::{error, info, warn};
use mongodb::{
    bson::{doc, oid::ObjectId},
    Collection, Database,
};

const COLLECTION_NAME: &str = "tokens";

/// Hashes a token for secure storage in the database
fn hash_token(token: &str) -> Result<String, AppError> {
    hash(token, DEFAULT_COST).map_err(|e| {
        error!("Error hashing token: {:?}", e);
        AppError::InternalError(e.to_string())
    })
}

fn get_collection(db: &Database) -> Collection<StoredToken> {
    db.collection::<StoredToken>(COLLECTION_NAME)
}

/// Create a new token in the database
pub async fn create_token(
    db: &Database,
    user_id: &str,
    token: &str,
    purpose: TokenPurpose,
    expiry_hours: i64,
) -> Result<StoredToken, AppError> {
    let collection = get_collection(db);

    // Convert string ID to ObjectId
    let user_object_id = ObjectId::parse_str(user_id).map_err(|e| {
        error!("Invalid ObjectId format: {:?}", e);
        AppError::InvalidId
    })?;

    let now = mongodb::bson::DateTime::now();

    // Calculate expiry time
    let expire_time = {
        let now_millis = now.timestamp_millis();
        let expiry_millis = now_millis + (expiry_hours * 3600 * 1000);
        mongodb::bson::DateTime::from_millis(expiry_millis)
    };

    // Format token with user ID prefix for easier lookups
    // Only if the token doesn't already have this format
    let formatted_token = if !token.contains(':') {
        format!("{}:{}", user_id, token)
    } else {
        token.to_string()
    };

    // Original formatted token for client use
    let plain_token = formatted_token.clone();

    // Create hashed token for storage
    let hashed_token = hash_token(&formatted_token)?;

    // Create the token document
    // MongoDB will automatically assign _id when inserted
    let token_doc = StoredToken {
        id: ObjectId::new(), // This will be set as _id in MongoDB
        user_id: user_object_id,
        token: hashed_token,
        purpose,
        expires_at: expire_time,
        created_at: now,
    };

    collection.insert_one(&token_doc).await.map_err(|e| {
        error!("Database error creating token: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Return with original plain token for client use
    Ok(StoredToken {
        token: plain_token,
        ..token_doc
    })
}

/// Find a token by its value
pub async fn find_by_token(db: &Database, token: &str) -> Result<Option<StoredToken>, AppError> {
    // Token format could be like "{userId}:{random}" to help with lookup
    // If your tokens follow this format, extract the user ID first
    let parts: Vec<&str> = token.split(':').collect();
    let collection = get_collection(db);

    let filter = if parts.len() > 1 && ObjectId::parse_str(parts[0]).is_ok() {
        // If token contains user ID as first part, only search that user's tokens
        let user_id = ObjectId::parse_str(parts[0]).unwrap();
        doc! { "user_id": user_id }
    } else {
        // Otherwise, we have to search all tokens
        doc! {}
    };

    let cursor = collection.find(filter).await.map_err(|e| {
        error!("Database error finding tokens: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    let tokens = cursor
        .try_collect::<Vec<StoredToken>>()
        .await
        .map_err(|e| {
            error!("Database error collecting tokens: {:?}", e);
            AppError::DatabaseError(e)
        })?;

    for db_token in tokens {
        // Verify if the provided token matches the stored hash
        if verify(token, &db_token.token).map_err(|e| {
            error!("Error verifying token: {:?}", e);
            AppError::InternalError(e.to_string())
        })? {
            // Return with original plain token
            return Ok(Some(StoredToken {
                token: token.to_string(),
                ..db_token
            }));
        }
    }

    Ok(None)
}

/// Delete a token by its value
pub async fn delete_token(db: &Database, token: &str) -> Result<bool, AppError> {
    // Log the token attempt for debugging (only showing first few chars for security)
    let safe_token_prefix = if token.len() > 8 { &token[0..8] } else { token };
    info!(
        "Attempting to delete token starting with: {}...",
        safe_token_prefix
    );

    // Find the token first (which verifies the hash)
    let token_doc = find_by_token(db, token).await?;

    if let Some(token_doc) = token_doc {
        // Delete using the token's ID
        let collection = get_collection(db);
        let token_id = token_doc.id;

        info!("Found token with ID: {}, deleting by id", token_id);

        // Use just id - because of the #[serde(rename = "_id")] in the model
        // this will automatically map to MongoDB's _id field
        let filter = doc! { "_id": token_id };

        let result = collection.delete_one(filter).await.map_err(|e| {
            error!("Database error deleting token: {:?}", e);
            AppError::DatabaseError(e)
        })?;

        if result.deleted_count == 0 {
            // If that didn't work, try by user_id and purpose
            let user_id = token_doc.user_id;
            let purpose = token_doc.purpose.to_string();

            info!(
                "Failed to delete by ID, trying by user_id: {} and purpose: {}",
                user_id, purpose
            );

            let filter = doc! {
                "user_id": user_id,
                "purpose": purpose
            };

            let result = collection.delete_one(filter).await.map_err(|e| {
                error!(
                    "Database error deleting token by user_id and purpose: {:?}",
                    e
                );
                AppError::DatabaseError(e)
            })?;

            if result.deleted_count > 0 {
                info!("Successfully deleted token by user_id and purpose");
            } else {
                warn!("Failed to delete token by any method");
            }

            Ok(result.deleted_count > 0)
        } else {
            info!("Successfully deleted token by ID");
            Ok(true)
        }
    } else {
        // Try to delete by user_id and purpose if we can extract user_id from token
        let parts: Vec<&str> = token.split(':').collect();
        if parts.len() > 1 && ObjectId::parse_str(parts[0]).is_ok() {
            let user_id = ObjectId::parse_str(parts[0]).unwrap();
            let collection = get_collection(db);

            info!(
                "Token not found by hash verification, trying to delete by user_id: {}",
                user_id
            );

            // Try both possible purposes
            // Try EmailVerification first
            let filter = doc! {
                "user_id": user_id,
                "purpose": TokenPurpose::EmailVerification.to_string()
            };

            let email_result = collection.delete_many(filter).await.map_err(|e| {
                error!(
                    "Database error deleting email verification token by user_id: {:?}",
                    e
                );
                AppError::DatabaseError(e)
            })?;

            if email_result.deleted_count > 0 {
                info!(
                    "Deleted {} email verification token(s)",
                    email_result.deleted_count
                );
                return Ok(true);
            }

            // Try PasswordReset next
            let filter = doc! {
                "user_id": user_id,
                "purpose": TokenPurpose::PasswordReset.to_string()
            };

            let reset_result = collection.delete_many(filter).await.map_err(|e| {
                error!(
                    "Database error deleting password reset token by user_id: {:?}",
                    e
                );
                AppError::DatabaseError(e)
            })?;

            if reset_result.deleted_count > 0 {
                info!(
                    "Deleted {} password reset token(s)",
                    reset_result.deleted_count
                );
                return Ok(true);
            }

            warn!("Could not delete any tokens for user: {}", user_id);
            Ok(false)
        } else {
            // Token not found and couldn't extract user_id
            error!(
                "Token not found for deletion and couldn't extract user_id from token: {}",
                safe_token_prefix
            );
            Ok(false)
        }
    }
}

/// Delete all tokens for a specific user and purpose
pub async fn delete_tokens_by_user_and_purpose(
    db: &Database,
    user_id: &str,
    purpose: TokenPurpose,
) -> Result<u64, AppError> {
    let collection = get_collection(db);

    // Convert string ID to ObjectId
    let user_object_id = ObjectId::parse_str(user_id).map_err(|e| {
        error!("Invalid ObjectId format: {:?}", e);
        AppError::InvalidId
    })?;

    let filter = doc! {
        "user_id": user_object_id,
        "purpose": purpose.to_string(),
    };

    let result = collection.delete_many(filter).await.map_err(|e| {
        error!("Database error deleting tokens: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(result.deleted_count)
}

/// Delete expired tokens
pub async fn delete_expired_tokens(db: &Database) -> Result<u64, AppError> {
    let collection = get_collection(db);
    let now = mongodb::bson::DateTime::now();

    let filter = doc! { "expires_at": { "$lt": now } };

    let result = collection.delete_many(filter).await.map_err(|e| {
        error!("Database error deleting expired tokens: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(result.deleted_count)
}

/// Validate a token (check if it exists and hasn't expired)
pub async fn validate_token(
    db: &Database,
    token: &str,
    purpose: TokenPurpose,
) -> Result<Option<StoredToken>, AppError> {
    let collection = get_collection(db);
    let now = mongodb::bson::DateTime::now();

    // Token format could be like "{userId}:{random}" to help with lookup
    // If your tokens follow this format, extract the user ID first
    let parts: Vec<&str> = token.split(':').collect();

    // Build the filter based on purpose, expiration, and user ID if available
    let mut filter_doc = doc! {
        "purpose": purpose.to_string(),
        "expires_at": { "$gt": now }
    };

    // If token contains user ID as first part, only search that user's tokens
    if parts.len() > 1 && ObjectId::parse_str(parts[0]).is_ok() {
        let user_id = ObjectId::parse_str(parts[0]).expect("Invalid ObjectId format");
        filter_doc.insert("user_id", user_id);
    }

    let cursor = collection.find(filter_doc).await.map_err(|e| {
        error!("Database error finding tokens: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    let tokens = cursor
        .try_collect::<Vec<StoredToken>>()
        .await
        .map_err(|e| {
            error!("Database error collecting tokens: {:?}", e);
            AppError::DatabaseError(e)
        })?;

    for db_token in tokens {
        // Verify if the provided token matches the stored hash
        if verify(token, &db_token.token).map_err(|e| {
            error!("Error verifying token: {:?}", e);
            AppError::InternalError(e.to_string())
        })? {
            // Return with original plain token
            return Ok(Some(StoredToken {
                token: token.to_string(),
                ..db_token
            }));
        }
    }

    Ok(None)
}
