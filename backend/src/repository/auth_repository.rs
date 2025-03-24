use crate::models::auth::LoginAttempt;
use crate::models::error::AppError;
use chrono::{Duration, Utc};
use futures::TryStreamExt;
use log::error;
use mongodb::{
    bson::{self, doc},
    options::FindOptions,
    Collection, Database,
};

const COLLECTION_NAME: &str = "login_attempts";

fn get_collection(db: &Database) -> Collection<LoginAttempt> {
    db.collection::<LoginAttempt>(COLLECTION_NAME)
}

/// Add a new login attempt record
pub async fn add_login_attempt(db: &Database, attempt: &LoginAttempt) -> Result<(), AppError> {
    let collection = get_collection(db);
    collection.insert_one(attempt).await.map_err(|e| {
        error!("Database error recording login attempt: {:?}", e);
        AppError::DatabaseError(e)
    })?;
    Ok(())
}

/// Count recent failed attempts for a given username and/or IP
pub async fn count_recent_failed_attempts(
    db: &Database,
    username: &str,
    ip_address: &str,
    window_minutes: i64,
) -> Result<usize, AppError> {
    let collection = get_collection(db);

    // Calculate the time window
    let window_start = Utc::now() - Duration::minutes(window_minutes);
    // Convert to MongoDB DateTime
    let window_start_bson = bson::DateTime::from_millis(window_start.timestamp_millis());

    // Create filter for username OR IP address with recent timestamp and failed attempts
    let filter = doc! {
        "$or": [
            { "username": username },
            { "ip_address": ip_address }
        ],
        "created_at": { "$gte": window_start_bson },
        "successful": false
    };

    // Count matching documents
    let count = collection.count_documents(filter).await.map_err(|e| {
        error!("Database error counting login attempts: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(count as usize)
}

/// Check if CAPTCHA should be required for this user or IP
pub async fn should_require_captcha(
    db: &Database,
    username: &str,
    ip_address: &str,
    threshold: usize,
    window_minutes: i64,
) -> Result<bool, AppError> {
    let attempts = count_recent_failed_attempts(db, username, ip_address, window_minutes).await?;
    Ok(attempts >= threshold)
}

/// Clean up old login attempts beyond retention period
pub async fn cleanup_old_attempts(db: &Database, retention_days: i64) -> Result<u64, AppError> {
    let collection = get_collection(db);

    // Calculate retention cutoff date
    let cutoff_date = Utc::now() - Duration::days(retention_days);
    // Convert to MongoDB DateTime
    let cutoff_date_bson = bson::DateTime::from_millis(cutoff_date.timestamp_millis());

    // Create filter for old records
    let filter = doc! {
        "created_at": { "$lt": cutoff_date_bson }
    };

    // Delete old records
    let result = collection.delete_many(filter).await.map_err(|e| {
        error!("Database error cleaning up login attempts: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(result.deleted_count)
}

/// Get recent login attempts for an admin dashboard
pub async fn get_recent_attempts(db: &Database, limit: i64) -> Result<Vec<LoginAttempt>, AppError> {
    let collection = get_collection(db);

    // Use find without options first
    let mut cursor = collection.find(doc! {}).await.map_err(|e| {
        error!("Database error fetching recent login attempts: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Then manually process for sorting and limiting
    let mut attempts = Vec::new();
    while let Some(attempt) = cursor.try_next().await.map_err(|e| {
        error!("Database error iterating login attempts: {:?}", e);
        AppError::DatabaseError(e)
    })? {
        attempts.push(attempt);
    }

    // Sort attempts by created_at, descending
    attempts.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Limit the results
    if attempts.len() > limit as usize {
        attempts.truncate(limit as usize);
    }

    Ok(attempts)
}
