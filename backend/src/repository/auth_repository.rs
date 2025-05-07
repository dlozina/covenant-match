use crate::models::auth::LoginAttempt;
use crate::models::error::AppError;
use chrono::{Duration, Utc};
use futures::TryStreamExt;
use log::error;
use mongodb::{
    bson::{doc, DateTime},
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
    let window_start_bson = DateTime::from_millis(window_start.timestamp_millis());

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

    #[allow(clippy::cast_possible_truncation)]
    Ok(count as usize)
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

/// Get paginated login attempts with optional filters
pub async fn get_login_attempts_paginated(
    db: &Database,
    page: u64,
    limit: u64,
    username: Option<String>,
    status: Option<bool>,
) -> Result<(Vec<LoginAttempt>, u64), AppError> {
    let collection = get_collection(db);

    // Build filter
    let mut filter = doc! {};

    // Add username filter if provided
    if let Some(username) = username {
        filter.insert("username", username);
    }

    // Add status filter if provided
    if let Some(status) = status {
        filter.insert("successful", status);
    }

    // Count total matching documents for pagination
    let total = collection
        .count_documents(filter.clone())
        .await
        .map_err(|e| {
            error!("Database error counting login attempts: {:?}", e);
            AppError::DatabaseError(e)
        })? as u64;

    // Calculate skip value for pagination
    let skip = (page - 1) * limit;

    // Perform the query with pagination using the fluent API
    let mut cursor = collection
        .find(filter)
        .sort(doc! { "created_at": -1 })
        .skip(skip)
        .limit(limit as i64)
        .await
        .map_err(|e| {
            error!("Database error fetching login attempts: {:?}", e);
            AppError::DatabaseError(e)
        })?;

    // Convert cursor to vector of LoginAttempt
    let mut attempts = Vec::new();
    while let Some(attempt) = cursor.try_next().await.map_err(|e| {
        error!("Database error iterating login attempts: {:?}", e);
        AppError::DatabaseError(e)
    })? {
        attempts.push(attempt);
    }

    Ok((attempts, total))
}
