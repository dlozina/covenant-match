use crate::models::error::AppError;
use crate::models::token::{Token, TokenPurpose};
use bcrypt::{hash, verify, DEFAULT_COST};
use futures::stream::TryStreamExt;
use log::error;
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

fn get_collection(db: &Database) -> Collection<Token> {
    db.collection::<Token>(COLLECTION_NAME)
}

/// Create a new token in the database
pub async fn create_token(
    db: &Database,
    user_id: &str,
    token: &str,
    purpose: TokenPurpose,
    expiry_hours: i64,
) -> Result<Token, AppError> {
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

    let token_doc = Token {
        id: ObjectId::new(),
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
    Ok(Token {
        token: plain_token,
        ..token_doc
    })
}

/// Find a token by its value
pub async fn find_by_token(db: &Database, token: &str) -> Result<Option<Token>, AppError> {
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

    let tokens = cursor.try_collect::<Vec<Token>>().await.map_err(|e| {
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
            return Ok(Some(Token {
                token: token.to_string(),
                ..db_token
            }));
        }
    }

    Ok(None)
}

/// Delete a token by its value
pub async fn delete_token(db: &Database, token: &str) -> Result<bool, AppError> {
    // Find the token first (which verifies the hash)
    let token_doc = find_by_token(db, token).await?;

    if let Some(token_doc) = token_doc {
        // Delete using the token's ID
        let collection = get_collection(db);
        let filter = doc! { "_id": token_doc.id };

        let result = collection.delete_one(filter).await.map_err(|e| {
            error!("Database error deleting token: {:?}", e);
            AppError::DatabaseError(e)
        })?;

        Ok(result.deleted_count > 0)
    } else {
        // Token not found, so "deletion" is considered successful
        Ok(false)
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
) -> Result<Option<Token>, AppError> {
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
        let user_id = ObjectId::parse_str(parts[0]).unwrap();
        filter_doc.insert("user_id", user_id);
    }

    let cursor = collection.find(filter_doc).await.map_err(|e| {
        error!("Database error finding tokens: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    let tokens = cursor.try_collect::<Vec<Token>>().await.map_err(|e| {
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
            return Ok(Some(Token {
                token: token.to_string(),
                ..db_token
            }));
        }
    }

    Ok(None)
}
