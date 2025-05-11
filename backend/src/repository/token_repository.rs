use crate::models::error::AppError;
use crate::models::token::{StoredTokenMetadata, TokenPurpose};
use crate::utils::jwt;
use log::{error, info, warn};
use mongodb::{
    bson::{doc, oid::ObjectId},
    options::IndexOptions,
    Collection, Database, IndexModel,
};
use std::time::Duration;

const COLLECTION_NAME: &str = "tokens";

fn get_collection(db: &Database) -> Collection<StoredTokenMetadata> {
    db.collection::<StoredTokenMetadata>(COLLECTION_NAME)
}

/// Create a new token in the database
pub async fn create_token(db: &Database, token: &str) -> Result<StoredTokenMetadata, AppError> {
    let collection = get_collection(db);

    // Try to decode the token as email verification token first
    let token_doc = match jwt::validate_email_verification_token(token) {
        Ok(claims) => {
            // Convert string ID to ObjectId
            let user_object_id = ObjectId::parse_str(&claims.sub).map_err(|e| {
                error!("Invalid ObjectId format in email token: {:?}", e);
                AppError::InvalidId
            })?;

            // Create token metadata using the helper method
            StoredTokenMetadata::from_claims(user_object_id, claims.jti, claims.purpose, claims.exp)
        }
        // If not an email token, try as password reset token
        Err(_) => match jwt::validate_reset_password_token(token) {
            Ok(reset_claims) => {
                // Convert string ID to ObjectId
                let user_object_id = ObjectId::parse_str(&reset_claims.sub).map_err(|e| {
                    error!("Invalid ObjectId format in reset token: {:?}", e);
                    AppError::InvalidId
                })?;

                info!(
                    "Creating password reset token for user: {}",
                    reset_claims.sub
                );

                // Create token metadata using the helper method
                StoredTokenMetadata::from_claims(
                    user_object_id,
                    reset_claims.jti,
                    reset_claims.purpose,
                    reset_claims.exp,
                )
            }
            Err(e) => {
                error!("Invalid JWT token: {:?}", e);
                return Err(AppError::InvalidToken);
            }
        },
    };

    collection.insert_one(&token_doc).await.map_err(|e| {
        error!("Database error creating token: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(token_doc)
}

/// Find a token by its JWT token value
pub async fn find_by_token(
    db: &Database,
    token: &str,
) -> Result<Option<StoredTokenMetadata>, AppError> {
    let collection = get_collection(db);

    // First attempt to validate as email verification token (which has JTI)
    match jwt::validate_email_verification_token(token) {
        Ok(claims) => {
            // Extract user ID from the token
            let user_id = ObjectId::parse_str(&claims.sub).map_err(|e| {
                error!("Invalid ObjectId format: {:?}", e);
                AppError::InvalidId
            })?;

            // Email verification tokens have JTI
            find_token_basic(&collection, user_id, claims.purpose, Some(claims.jti)).await
        }
        Err(_) => {
            // Try as password reset token
            match jwt::validate_reset_password_token(token) {
                Ok(reset_claims) => {
                    let user_id = ObjectId::parse_str(&reset_claims.sub).map_err(|e| {
                        error!("Invalid ObjectId format: {:?}", e);
                        AppError::InvalidId
                    })?;

                    // Password reset tokens now have JTI
                    find_token_basic(
                        &collection,
                        user_id,
                        reset_claims.purpose,
                        Some(reset_claims.jti),
                    )
                    .await
                }
                Err(e) => {
                    warn!("Invalid JWT token: {:?}", e);
                    Ok(None)
                }
            }
        }
    }
}

/// Delete a token by its JWT token value
pub async fn delete_token(db: &Database, token: &str) -> Result<String, AppError> {
    let collection = get_collection(db);

    // First try as email verification token
    match jwt::validate_email_verification_token(token) {
        Ok(claims) => {
            let user_id = ObjectId::parse_str(&claims.sub).map_err(|e| {
                error!("Invalid ObjectId format: {:?}", e);
                AppError::InvalidId
            })?;

            // Use the module-level delete function
            delete_token_from_db(&collection, user_id, claims.purpose, Some(claims.jti)).await?;

            Ok(claims.sub)
        }
        Err(_) => {
            // Try as password reset token
            match jwt::validate_reset_password_token(token) {
                Ok(reset_claims) => {
                    let user_id = ObjectId::parse_str(&reset_claims.sub).map_err(|e| {
                        error!("Invalid ObjectId format: {:?}", e);
                        AppError::InvalidId
                    })?;

                    // Password reset tokens now have JTI
                    delete_token_from_db(
                        &collection,
                        user_id,
                        reset_claims.purpose,
                        Some(reset_claims.jti),
                    )
                    .await?;

                    Ok(reset_claims.sub)
                }
                Err(e) => {
                    warn!("Invalid JWT token: {:?}", e);
                    Err(AppError::InvalidOrExpiredToken)
                }
            }
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

    info!("Deleting expired tokens. Current time: {}", now);

    let filter = doc! { "expires_at": { "$lt": now } };

    let result = collection.delete_many(filter).await.map_err(|e| {
        error!("Database error deleting expired tokens: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    info!("Deleted {} expired tokens", result.deleted_count);
    Ok(result.deleted_count)
}

/// Validate a token (check if it exists and hasn't expired)
pub async fn validate_token(
    db: &Database,
    token: &str,
) -> Result<Option<StoredTokenMetadata>, AppError> {
    let collection = get_collection(db);
    let now = mongodb::bson::DateTime::now();

    // First try decoding as an email verification token
    match jwt::validate_email_verification_token(token) {
        Ok(claims) => {
            let user_id = ObjectId::parse_str(&claims.sub).map_err(|e| {
                error!("Invalid ObjectId format in email token: {:?}", e);
                AppError::InvalidId
            })?;

            find_token_in_db(&collection, user_id, claims.purpose, Some(claims.jti), now).await
        }
        // If not an email token, try as password reset token
        Err(_) => {
            // Try as password reset token
            match jwt::validate_reset_password_token(token) {
                Ok(reset_claims) => {
                    let user_id = ObjectId::parse_str(&reset_claims.sub).map_err(|e| {
                        error!("Invalid ObjectId format in reset token: {:?}", e);
                        AppError::InvalidId
                    })?;

                    find_token_in_db(
                        &collection,
                        user_id,
                        reset_claims.purpose,
                        Some(reset_claims.jti),
                        now,
                    )
                    .await
                }
                Err(e) => {
                    warn!("Invalid JWT token: {:?}", e);
                    Ok(None)
                }
            }
        }
    }
}

// Common function to search for token by user_id, purpose, and optional JTI
async fn find_token_in_db(
    collection: &Collection<StoredTokenMetadata>,
    user_id: ObjectId,
    purpose: String,
    token_jti: Option<String>,
    now: mongodb::bson::DateTime,
) -> Result<Option<StoredTokenMetadata>, AppError> {
    // Build filter based on whether we have a JTI or not
    let filter = if let Some(jti) = token_jti {
        doc! {
            "user_id": user_id,
            "token_jti": jti,
            "purpose": purpose,
            "expires_at": { "$gt": now }
        }
    } else {
        doc! {
            "user_id": user_id,
            "purpose": purpose,
            "expires_at": { "$gt": now }
        }
    };

    let result = collection.find_one(filter).await.map_err(|e| {
        error!("Database error finding token: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(result)
}

// Helper function to search for token without expiration check
async fn find_token_basic(
    collection: &Collection<StoredTokenMetadata>,
    user_id: ObjectId,
    purpose: String,
    token_jti: Option<String>,
) -> Result<Option<StoredTokenMetadata>, AppError> {
    // Build filter based on whether we have a JTI or not
    let filter = if let Some(jti) = token_jti {
        doc! {
            "user_id": user_id,
            "token_jti": jti,
            "purpose": purpose
        }
    } else {
        doc! {
            "user_id": user_id,
            "purpose": purpose
        }
    };

    collection.find_one(filter).await.map_err(|e| {
        error!("Database error finding token: {:?}", e);
        AppError::DatabaseError(e)
    })
}

// Common function to delete token by user_id, purpose, and optional JTI
async fn delete_token_from_db(
    collection: &Collection<StoredTokenMetadata>,
    user_id: ObjectId,
    purpose: String,
    token_jti: Option<String>,
) -> Result<bool, AppError> {
    // Try to delete with the most specific criteria first
    if let Some(jti) = token_jti {
        let filter = doc! {
            "user_id": user_id,
            "token_jti": jti,
            "purpose": purpose.clone() // Clone to avoid the moved value error
        };

        let result = collection.delete_one(filter).await.map_err(|e| {
            error!("Database error deleting token: {:?}", e);
            AppError::DatabaseError(e)
        })?;

        if result.deleted_count > 0 {
            return Ok(true);
        }
    }

    // If precise lookup failed, delete by user_id and purpose as fallback
    let filter = doc! {
        "user_id": user_id,
        "purpose": purpose
    };

    let result = collection.delete_many(filter).await.map_err(|e| {
        error!(
            "Database error deleting tokens by user_id and purpose: {:?}",
            e
        );
        AppError::DatabaseError(e)
    })?;

    Ok(result.deleted_count > 0)
}
