use crate::models::chat::{ChatMessage, ChatSession};
use crate::models::error::AppError;
use crate::services::chat_service::AdminChatHistoryResult;
use chrono::{DateTime, Duration, Utc};
use futures::TryStreamExt;
use mongodb::{
    bson::{self, doc, to_bson, Document},
    Collection, Database,
};
use std::collections::HashSet;

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
        let Ok(a_time) = a.get_datetime("timestamp") else {
            return std::cmp::Ordering::Equal;
        };

        let Ok(b_time) = b.get_datetime("timestamp") else {
            return std::cmp::Ordering::Equal;
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
                .map_err(|e| AppError::BadRequest(format!("Invalid message ID: {e}")))?,
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
        let Ok(a_time) = a.get_datetime("timestamp") else {
            return std::cmp::Ordering::Equal;
        };

        let Ok(b_time) = b.get_datetime("timestamp") else {
            return std::cmp::Ordering::Equal;
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

    // Check if the session exists
    let session_exists = get_sessions_collection(db)
        .find_one(filter.clone())
        .await?
        .is_some();

    let now = Utc::now();

    if session_exists {
        // Update existing session
        let update = doc! {
            "$set": {
                "last_activity": to_bson(&now)?,
                "updated_at": to_bson(&now)?
            }
        };

        let result = get_sessions_collection(db)
            .update_one(filter, update)
            .await?;

        if result.modified_count > 0 {
            log::debug!(
                "Updated last activity for session {}: timestamp = {}",
                session_id,
                now
            );
        } else {
            log::warn!(
                "Failed to update activity for session {}: no document modified",
                session_id
            );
        }
    } else {
        // If the session doesn't exist yet, try to find participant information from messages
        let message_filter = doc! { "session_id": session_id };
        let mut participants = HashSet::new();

        // Find unique participants from messages
        let cursor = get_messages_collection(db).find(message_filter).await?;
        let messages: Vec<Document> = cursor.try_collect().await?;

        for message in messages {
            if let Ok(sender_id) = message.get_str("sender_id") {
                participants.insert(sender_id.to_string());
            }
        }

        if participants.is_empty() {
            log::warn!(
                "Cannot create session {}: no participants found in messages",
                session_id
            );
            return Ok(());
        }

        log::info!(
            "Created new chat session from messages: {} with timestamp {}",
            session_id,
            now
        );
    }

    Ok(())
}

// Get sessions that need to be marked as inactive (for debugging)
pub async fn get_sessions_to_clean(
    db: &Database,
    inactive_seconds: i64,
) -> Result<Vec<Document>, AppError> {
    let cutoff_time = Utc::now() - Duration::seconds(inactive_seconds);

    // Find active sessions that are older than the cutoff time
    let filter = doc! {
        "last_activity": { "$lt": to_bson(&cutoff_time)? },
        "active": true
    };

    let cursor = get_sessions_collection(db).find(filter).await?;
    let sessions: Vec<Document> = cursor.try_collect().await?;

    // Get session counts for diagnostics
    let total_sessions = get_sessions_collection(db).count_documents(doc! {}).await?;
    let active_sessions = get_sessions_collection(db)
        .count_documents(doc! { "active": true })
        .await?;

    log::info!(
        "DEBUG: Total sessions in DB: {}, Active sessions: {}, Inactive sessions: {}",
        total_sessions,
        active_sessions,
        total_sessions - active_sessions
    );

    Ok(sessions)
}

// Clean up inactive chat sessions and their messages -> Time is a bitch
#[allow(clippy::too_many_lines)]
pub async fn cleanup_inactive_sessions(
    db: &Database,
    inactive_seconds: i64,
) -> Result<u64, AppError> {
    let cutoff_time = Utc::now() - Duration::seconds(inactive_seconds);

    // Find sessions that need to be marked as inactive (still active but past cutoff time)
    let filter = doc! {
        "last_activity": { "$lt": to_bson(&cutoff_time)? },
        "active": true
    };

    // Mark sessions as inactive
    let update = doc! {
        "$set": {
            "active": false,
            "updated_at": to_bson(&Utc::now())?
        }
    };

    let result = get_sessions_collection(db)
        .update_many(filter.clone(), update)
        .await?;

    let sessions_modified = result.modified_count;

    log::info!(
        "Marked {} active sessions as inactive (older than {} seconds)",
        sessions_modified,
        inactive_seconds
    );

    // Now find all inactive sessions and delete their messages
    let inactive_filter = doc! { "active": false };

    let inactive_cursor = get_sessions_collection(db).find(inactive_filter).await?;

    let inactive_sessions: Vec<Document> = inactive_cursor.try_collect().await?;
    let mut total_messages_deleted = 0;

    // Log how many inactive sessions we found
    log::debug!(
        "Found {} inactive sessions - checking for message deletion",
        inactive_sessions.len()
    );

    // Process each inactive session
    for session_doc in inactive_sessions {
        if let Ok(session_id) = session_doc.get_str("session_id") {
            // Try to get last_activity using multiple approaches
            let mut last_activity_chrono: Option<DateTime<Utc>> = None;

            // First try as DateTime
            if let Ok(last_activity) = session_doc.get_datetime("last_activity") {
                last_activity_chrono = Some(
                    chrono::DateTime::from_timestamp_millis(last_activity.timestamp_millis())
                        .unwrap_or_else(Utc::now),
                );
                log::debug!("Successfully retrieved last_activity as DateTime");
            }
            // Try as String (ISO date)
            else if let Ok(date_str) = session_doc.get_str("last_activity") {
                match DateTime::parse_from_rfc3339(date_str) {
                    Ok(dt) => {
                        last_activity_chrono = Some(dt.with_timezone(&Utc));
                        log::debug!(
                            "Successfully parsed last_activity from string: {}",
                            date_str
                        );
                    }
                    Err(e) => {
                        log::warn!("Failed to parse last_activity string '{}': {}", date_str, e);
                    }
                }
            }
            // Try as i64 (timestamp)
            else if let Ok(timestamp) = session_doc.get_i64("last_activity") {
                last_activity_chrono =
                    Some(chrono::DateTime::from_timestamp(timestamp, 0).unwrap_or_else(Utc::now));
                log::debug!(
                    "Successfully converted last_activity from i64 timestamp: {}",
                    timestamp
                );
            }

            // Dump the entire document for debugging
            log::debug!(
                "DEBUG: Session document for {}: {:?}",
                session_id,
                session_doc
            );

            // Now proceed if we have a valid last_activity
            if let Some(last_activity_dt) = last_activity_chrono {
                let inactive_duration = Utc::now()
                    .signed_duration_since(last_activity_dt)
                    .num_seconds();

                // For logging purposes
                log::debug!(
                    "Inactive session {} - Last activity: {}, Inactive for: {} seconds, Threshold: {} seconds",
                    session_id,
                    last_activity_dt,
                    inactive_duration,
                    inactive_seconds
                );

                // Count messages for this session before deletion
                let message_count = get_messages_collection(db)
                    .count_documents(doc! { "session_id": session_id })
                    .await?;

                log::debug!(
                    "Session {} has {} messages before potential deletion",
                    session_id,
                    message_count
                );

                // Delete messages if session has been inactive long enough
                if inactive_duration > inactive_seconds {
                    // Delete all messages for this session
                    let delete_filter = doc! { "session_id": session_id };

                    log::debug!(
                        "Deleting messages for session {} (inactive for {} seconds > threshold {})",
                        session_id,
                        inactive_duration,
                        inactive_seconds
                    );

                    let delete_result = get_messages_collection(db)
                        .delete_many(delete_filter)
                        .await?;

                    total_messages_deleted += delete_result.deleted_count;

                    log::debug!(
                        "Deleted {} messages from inactive session {} (inactive for {} seconds)",
                        delete_result.deleted_count,
                        session_id,
                        inactive_duration
                    );
                } else {
                    log::debug!(
                        "Not deleting messages for session {} yet (inactive for {} seconds <= threshold {})",
                        session_id,
                        inactive_duration,
                        inactive_seconds
                    );
                }
            } else {
                // Last resort: If we can't determine the last activity time,
                // assume it's old enough and delete messages anyway
                log::warn!(
                    "Could not determine last_activity time for session {}. Will delete messages as fallback.",
                    session_id
                );

                // Count messages for this session
                let message_count = get_messages_collection(db)
                    .count_documents(doc! { "session_id": session_id })
                    .await?;

                log::debug!(
                    "Session {} has {} messages before deletion (fallback mode)",
                    session_id,
                    message_count
                );

                // Delete all messages for this session as fallback
                let delete_filter = doc! { "session_id": session_id };

                let delete_result = get_messages_collection(db)
                    .delete_many(delete_filter)
                    .await?;

                total_messages_deleted += delete_result.deleted_count;

                log::debug!(
                    "Deleted {} messages from inactive session {} (fallback mode due to invalid last_activity field)",
                    delete_result.deleted_count,
                    session_id
                );
            }
        } else {
            log::warn!("Session document missing session_id field");
        }
    }

    log::debug!(
        "Cleanup summary: {} sessions marked inactive, {} messages deleted from inactive sessions",
        sessions_modified,
        total_messages_deleted
    );

    // Return the count of sessions that were modified
    Ok(sessions_modified)
}
