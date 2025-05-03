use crate::models::error::AppError;
use crate::models::token::{Token, TokenPurpose};
use log::error;
use mongodb::{
    bson::{doc, oid::ObjectId},
    Collection, Database,
};

const COLLECTION_NAME: &str = "tokens";

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

    let token_doc = Token {
        id: ObjectId::new(),
        user_id: user_object_id,
        token: token.to_string(),
        purpose,
        expires_at: expire_time,
        created_at: now,
    };

    collection.insert_one(&token_doc).await.map_err(|e| {
        error!("Database error creating token: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(token_doc)
}

/// Find a token by its value
pub async fn find_by_token(db: &Database, token: &str) -> Result<Option<Token>, AppError> {
    let collection = get_collection(db);
    let filter = doc! { "token": token };

    collection.find_one(filter).await.map_err(|e| {
        error!("Database error finding token: {:?}", e);
        AppError::DatabaseError(e)
    })
}

/// Delete a token by its value
pub async fn delete_token(db: &Database, token: &str) -> Result<bool, AppError> {
    let collection = get_collection(db);
    let filter = doc! { "token": token };

    let result = collection.delete_one(filter).await.map_err(|e| {
        error!("Database error deleting token: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(result.deleted_count > 0)
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

    let filter = doc! {
        "token": token,
        "purpose": purpose.to_string(),
        "expires_at": { "$gt": now }
    };

    collection.find_one(filter).await.map_err(|e| {
        error!("Database error validating token: {:?}", e);
        AppError::DatabaseError(e)
    })
}
