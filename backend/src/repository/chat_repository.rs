use crate::models::chat::{ChatMessage, ChatSession};
use crate::models::error::AppError;
use crate::services::chat_service::AdminChatHistoryResult;
use chrono::{DateTime, Duration, Utc};
use futures::TryStreamExt;
use mongodb::{
    bson::{self, doc, to_bson, Document},
    Collection, Database,
};

// Get chat messages collection
fn get_messages_collection(db: &Database) -> Collection<Document> {
    db.collection::<Document>("chat_messages")
}

// Get chat sessions collection
fn get_sessions_collection(db: &Database) -> Collection<Document> {
    db.collection::<Document>("chat_sessions")
}

// Save a new chat message to the database
pub async fn save_message(db: &Database, message: &ChatMessage) -> Result<(), AppError> {
    let doc = bson::to_document(message).map_err(|e| {
        log::error!("Error converting message to document: {}", e);
        AppError::InternalError(e.to_string())
    })?;

    get_messages_collection(db).insert_one(doc).await?;
    Ok(())
}

// Get chat history for admin with filtering options
pub async fn get_admin_chat_history(
    db: &Database,
    session_id: Option<&str>,
    limit: i64,
    from_date: Option<DateTime<Utc>>,
    to_date: Option<DateTime<Utc>>,
) -> Result<AdminChatHistoryResult, AppError> {
    // Build the filter based on provided parameters
    let mut filter = doc! {};

    // Add session filter if provided
    if let Some(sid) = session_id {
        filter.insert("session_id", sid);
    }

    // Add date range if provided
    if from_date.is_some() || to_date.is_some() {
        let mut date_filter = doc! {};

        if let Some(from) = from_date {
            date_filter.insert("$gte", to_bson(&from)?);
        }

        if let Some(to) = to_date {
            date_filter.insert("$lte", to_bson(&to)?);
        }

        if !date_filter.is_empty() {
            filter.insert("timestamp", date_filter);
        }
    }

    // First get the total count for pagination info
    let total = get_messages_collection(db)
        .count_documents(filter.clone())
        .await?;

    // Use find with the filter and apply the limit
    let mut cursor = get_messages_collection(db).find(filter).await?;

    // Convert to documents
    let mut docs: Vec<Document> = Vec::new();
    let mut counter = 0;

    // Apply limit when collecting documents
    while let Some(doc) = cursor.try_next().await? {
        docs.push(doc);
        counter += 1;
        if counter >= limit {
            break;
        }
    }

    // Sort by timestamp (descending) - newest first for admin view
    docs.sort_by(|a, b| {
        let a_time = match a.get_datetime("timestamp") {
            Ok(time) => time,
            Err(_) => return std::cmp::Ordering::Equal,
        };

        let b_time = match b.get_datetime("timestamp") {
            Ok(time) => time,
            Err(_) => return std::cmp::Ordering::Equal,
        };

        b_time.cmp(a_time) // Descending order
    });

    // Convert to ChatMessage objects
    let messages = docs
        .into_iter()
        .filter_map(|doc| match bson::from_document::<ChatMessage>(doc) {
            Ok(msg) => Some(msg),
            Err(e) => {
                log::error!("Error deserializing message: {}", e);
                None
            }
        })
        .collect();

    Ok(AdminChatHistoryResult {
        messages,
        total: total as usize,
    })
}

// Delete chat messages for admin (by session ID, message ID, or date range)
pub async fn delete_admin_messages(
    db: &Database,
    session_id: Option<&str>,
    message_id: Option<&str>,
    from_date: Option<DateTime<Utc>>,
    to_date: Option<DateTime<Utc>>,
) -> Result<u64, AppError> {
    // Build the filter based on provided parameters
    let mut filter = doc! {};

    // Add session filter if provided
    if let Some(sid) = session_id {
        filter.insert("session_id", sid);
    }

    // Add message ID filter if provided
    if let Some(mid) = message_id {
        filter.insert(
            "_id",
            mongodb::bson::oid::ObjectId::parse_str(mid)
                .map_err(|e| AppError::BadRequest(format!("Invalid message ID: {}", e)))?,
        );
    }

    // Add date range if provided
    if from_date.is_some() || to_date.is_some() {
        let mut date_filter = doc! {};

        if let Some(from) = from_date {
            date_filter.insert("$gte", to_bson(&from)?);
        }

        if let Some(to) = to_date {
            date_filter.insert("$lte", to_bson(&to)?);
        }

        if !date_filter.is_empty() {
            filter.insert("timestamp", date_filter);
        }
    }

    // If we're deleting by session, also mark the session as inactive
    if let Some(sid) = session_id {
        if from_date.is_none() && to_date.is_none() && message_id.is_none() {
            // Only mark inactive if deleting the entire session
            let session_filter = doc! { "session_id": sid };
            let update = doc! { "$set": { "active": false } };

            let _ = get_sessions_collection(db)
                .update_one(session_filter, update)
                .await?;

            log::info!("Marked session {} as inactive after message deletion", sid);
        }
    }

    // Delete the messages
    let result = get_messages_collection(db).delete_many(filter).await?;

    log::info!("Admin deleted {} chat messages", result.deleted_count);

    Ok(result.deleted_count)
}

// Get chat history for a session with optional limit
pub async fn get_chat_history(
    db: &Database,
    session_id: &str,
    limit: i64,
) -> Result<Vec<ChatMessage>, AppError> {
    let filter = doc! { "session_id": session_id };

    // Use find() without options
    let cursor = get_messages_collection(db).find(filter).await?;

    // Convert to documents
    let mut docs: Vec<Document> = cursor.try_collect().await?;

    // Sort by timestamp (ascending)
    docs.sort_by(|a, b| {
        let a_time = match a.get_datetime("timestamp") {
            Ok(time) => time,
            Err(_) => return std::cmp::Ordering::Equal,
        };

        let b_time = match b.get_datetime("timestamp") {
            Ok(time) => time,
            Err(_) => return std::cmp::Ordering::Equal,
        };

        a_time.cmp(b_time)
    });

    // Apply limit - keep the LATEST messages by taking from the end
    // instead of truncating from the beginning
    if docs.len() > limit as usize {
        // Take the last 'limit' documents (most recent messages)
        let skip_count = docs.len() - limit as usize;
        docs = docs.into_iter().skip(skip_count).collect();
    }

    let messages = docs
        .into_iter()
        .filter_map(|doc| match bson::from_document::<ChatMessage>(doc) {
            Ok(msg) => Some(msg),
            Err(e) => {
                log::error!("Error deserializing message: {}", e);
                None
            }
        })
        .collect();

    Ok(messages)
}

// Mark messages as delivered for a user
pub async fn mark_messages_delivered(
    db: &Database,
    session_id: &str,
    user_id: &str,
) -> Result<u64, AppError> {
    let filter = doc! {
        "session_id": session_id,
        "delivered": false,
        "sender_id": { "$ne": user_id } // Don't mark user's own messages
    };

    let update = doc! {
        "$set": { "delivered": true }
    };

    let result = get_messages_collection(db)
        .update_many(filter, update)
        .await?;

    log::debug!(
        "Marked {} messages as delivered for user {} in session {}",
        result.modified_count,
        user_id,
        session_id
    );

    Ok(result.modified_count)
}

// Create or update a chat session
pub async fn ensure_chat_session(
    db: &Database,
    session_id: &str,
    participants: Vec<String>,
) -> Result<(), AppError> {
    let filter = doc! { "session_id": session_id };

    // Check if the session exists
    let session_exists = get_sessions_collection(db)
        .find_one(filter.clone())
        .await?
        .is_some();

    let now = Utc::now();

    if session_exists {
        // Update the session
        let update = doc! {
            "$set": {
                "participants": &participants,
                "updated_at": to_bson(&now)?,
                "last_activity": to_bson(&now)?,
                "active": true
            }
        };

        get_sessions_collection(db)
            .update_one(filter, update)
            .await?;
        log::debug!("Updated chat session: {}", session_id);
    } else {
        // Create a new session
        let session = ChatSession::new(session_id.to_string(), participants);
        let doc = bson::to_document(&session).map_err(|e| {
            log::error!("Error converting session to document: {}", e);
            AppError::InternalError(e.to_string())
        })?;

        get_sessions_collection(db).insert_one(doc).await?;
        log::debug!("Created new chat session: {}", session_id);
    }

    Ok(())
}

// Update the last activity timestamp for a session
pub async fn update_session_activity(db: &Database, session_id: &str) -> Result<(), AppError> {
    let filter = doc! { "session_id": session_id };

    let now = Utc::now();

    let update = doc! {
        "$set": {
            "last_activity": to_bson(&now)?,
            "updated_at": to_bson(&now)?
        }
    };

    get_sessions_collection(db)
        .update_one(filter, update)
        .await?;
    log::debug!("Updated last activity for session: {}", session_id);

    Ok(())
}

// Clean up inactive chat sessions and their messages
pub async fn cleanup_inactive_sessions(
    db: &Database,
    inactive_minutes: i64,
) -> Result<u64, AppError> {
    let cutoff_time = Utc::now() - Duration::minutes(inactive_minutes);

    // Find inactive sessions
    let filter = doc! {
        "last_activity": { "$lt": to_bson(&cutoff_time)? },
        "active": true
    };

    // Mark sessions as inactive
    let update = doc! {
        "$set": { "active": false }
    };

    let result = get_sessions_collection(db)
        .update_many(filter.clone(), update)
        .await?;

    log::info!(
        "Marked {} inactive chat sessions as inactive",
        result.modified_count
    );

    // Get the session IDs to clean up messages
    let cursor = get_sessions_collection(db)
        .find(doc! { "active": false })
        .await?;

    let inactive_sessions: Vec<Document> = cursor.try_collect().await?;
    let mut total_messages_marked = 0;

    for session_doc in inactive_sessions {
        if let Ok(session_id) = session_doc.get_str("session_id") {
            // Mark messages as delivered
            let filter = doc! { "session_id": session_id };
            let update = doc! { "$set": { "delivered": true } };

            let result = get_messages_collection(db)
                .update_many(filter, update)
                .await?;

            total_messages_marked += result.modified_count;

            log::info!(
                "Marked {} messages as delivered for inactive session {}",
                result.modified_count,
                session_id
            );
        }
    }

    Ok(total_messages_marked)
}
