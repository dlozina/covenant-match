use crate::models::chat::ChatMessage;
use crate::models::error::AppError;
use crate::repository::chat_repository;
use chrono::{DateTime, Utc};
use futures::TryStreamExt;
use log::{debug, info};
use mongodb::Database;
use std::sync::Arc;

/// Service for managing chat functionality
pub struct ChatService {
    db: Arc<Database>,
}

/// Result of admin chat history query, including messages and total count
pub struct AdminChatHistoryResult {
    pub messages: Vec<ChatMessage>,
    pub total: usize,
}

impl ChatService {
    /// Create a new ChatService instance
    pub fn new(db: &Database) -> Self {
        Self {
            db: Arc::new(db.clone()),
        }
    }

    /// Get chat history for a session
    pub async fn get_chat_history(
        &self,
        session_id: &str,
        limit: i64,
    ) -> Result<Vec<ChatMessage>, AppError> {
        debug!("Getting chat history for session: {}", session_id);
        chat_repository::get_chat_history(&self.db, session_id, limit).await
    }

    /// Get chat history for admin with filtering options
    pub async fn get_admin_chat_history(
        &self,
        session_id: Option<&str>,
        limit: i64,
        from_date: Option<&str>,
        to_date: Option<&str>,
    ) -> Result<AdminChatHistoryResult, AppError> {
        debug!("Admin getting chat history with filters");

        // Parse dates if provided
        let from_datetime = if let Some(date_str) = from_date {
            Some(
                DateTime::parse_from_rfc3339(date_str)
                    .map_err(|e| AppError::BadRequest(format!("Invalid from_date format: {}", e)))?
                    .with_timezone(&Utc),
            )
        } else {
            None
        };

        let to_datetime = if let Some(date_str) = to_date {
            Some(
                DateTime::parse_from_rfc3339(date_str)
                    .map_err(|e| AppError::BadRequest(format!("Invalid to_date format: {}", e)))?
                    .with_timezone(&Utc),
            )
        } else {
            None
        };

        chat_repository::get_admin_chat_history(
            &self.db,
            session_id,
            limit,
            from_datetime,
            to_datetime,
        )
        .await
    }

    /// Delete chat messages for admin (by session ID, message ID, or date range)
    pub async fn delete_admin_messages(
        &self,
        session_id: Option<&str>,
        message_id: Option<&str>,
        from_date: Option<&str>,
        to_date: Option<&str>,
    ) -> Result<u64, AppError> {
        debug!("Admin deleting chat messages with filters");

        // Parse dates if provided
        let from_datetime = if let Some(date_str) = from_date {
            Some(
                DateTime::parse_from_rfc3339(date_str)
                    .map_err(|e| AppError::BadRequest(format!("Invalid from_date format: {}", e)))?
                    .with_timezone(&Utc),
            )
        } else {
            None
        };

        let to_datetime = if let Some(date_str) = to_date {
            Some(
                DateTime::parse_from_rfc3339(date_str)
                    .map_err(|e| AppError::BadRequest(format!("Invalid to_date format: {}", e)))?
                    .with_timezone(&Utc),
            )
        } else {
            None
        };

        chat_repository::delete_admin_messages(
            &self.db,
            session_id,
            message_id,
            from_datetime,
            to_datetime,
        )
        .await
    }

    /// Store a new chat message
    pub async fn save_message(&self, message: &ChatMessage) -> Result<(), AppError> {
        debug!("Saving chat message: {:?}", message);

        // Save the message
        chat_repository::save_message(&self.db, message).await?;

        // Update the session's last activity
        chat_repository::update_session_activity(&self.db, &message.session_id).await?;

        Ok(())
    }

    /// Mark messages as delivered for a user
    pub async fn mark_messages_delivered(
        &self,
        session_id: &str,
        user_id: &str,
    ) -> Result<u64, AppError> {
        debug!(
            "Marking messages as delivered for user {} in session {}",
            user_id, session_id
        );
        chat_repository::mark_messages_delivered(&self.db, session_id, user_id).await
    }

    /// Create or update a chat session
    pub async fn ensure_chat_session(
        &self,
        session_id: &str,
        participants: Vec<String>,
    ) -> Result<(), AppError> {
        debug!("Ensuring chat session: {}", session_id);
        chat_repository::ensure_chat_session(&self.db, session_id, participants).await
    }

    /// Clean up inactive chat sessions
    pub async fn cleanup_inactive_sessions(&self, inactive_seconds: i64) -> Result<u64, AppError> {
        info!(
            "Cleaning up inactive chat sessions (inactive for {} seconds)",
            inactive_seconds
        );

        // First, check and log what sessions should be cleaned up
        self.debug_check_inactive_sessions(inactive_seconds).await?;

        let result = chat_repository::cleanup_inactive_sessions(&self.db, inactive_seconds).await?;

        info!(
            "Completed chat session cleanup. Sessions older than {} seconds are now marked inactive. Messages from sessions inactive for more than {} seconds have been deleted.",
            inactive_seconds,
            inactive_seconds
        );

        Ok(result)
    }

    /// Debug method to check for inactive sessions without modifying them
    async fn debug_check_inactive_sessions(&self, inactive_seconds: i64) -> Result<(), AppError> {
        let cutoff_time = chrono::Utc::now() - chrono::Duration::seconds(inactive_seconds);

        // Log the current time and cutoff time for debugging
        info!(
            "DEBUG: Current time: {}, Cutoff time for marking inactive: {}, Inactive seconds: {}",
            chrono::Utc::now(),
            cutoff_time,
            inactive_seconds
        );

        // Check for sessions that need to be marked as inactive
        let to_mark_inactive =
            chat_repository::get_sessions_to_clean(&self.db, inactive_seconds).await?;

        // Log sessions that will be marked inactive
        if to_mark_inactive.is_empty() {
            info!("DEBUG: No active sessions found that need to be marked inactive");
        } else {
            info!(
                "DEBUG: Found {} active sessions that will be marked as inactive",
                to_mark_inactive.len()
            );

            for session in &to_mark_inactive {
                if let (Ok(session_id), Ok(last_activity)) = (
                    session.get_str("session_id"),
                    session.get_datetime("last_activity"),
                ) {
                    // Convert MongoDB DateTime to Chrono DateTime for compatibility
                    let last_activity_chrono =
                        chrono::DateTime::from_timestamp_millis(last_activity.timestamp_millis())
                            .unwrap_or_else(|| chrono::Utc::now());

                    let seconds_inactive = chrono::Utc::now()
                        .signed_duration_since(last_activity_chrono)
                        .num_seconds();

                    info!(
                        "DEBUG: Active session {} will be marked inactive - Last activity: {}, Inactive for: {} seconds",
                        session_id,
                        last_activity,
                        seconds_inactive
                    );
                }
            }
        }

        // Check all inactive sessions (already marked as inactive)
        let all_inactive_cursor = self
            .db
            .collection::<mongodb::bson::Document>("chat_sessions")
            .find(mongodb::bson::doc! { "active": false })
            .await?;

        let all_inactive: Vec<mongodb::bson::Document> = all_inactive_cursor.try_collect().await?;

        info!(
            "DEBUG: Found {} already inactive sessions (checking for message deletion)",
            all_inactive.len()
        );

        // Check which inactive sessions will have messages deleted
        for session in all_inactive {
            if let (Ok(session_id), Ok(last_activity)) = (
                session.get_str("session_id"),
                session.get_datetime("last_activity"),
            ) {
                // Convert MongoDB DateTime to Chrono DateTime for comparison
                let last_activity_chrono =
                    chrono::DateTime::from_timestamp_millis(last_activity.timestamp_millis())
                        .unwrap_or_else(|| chrono::Utc::now());

                let inactive_duration = chrono::Utc::now()
                    .signed_duration_since(last_activity_chrono)
                    .num_seconds();

                // Check if messages should be deleted
                let should_delete = inactive_duration > inactive_seconds;

                info!(
                    "DEBUG: Inactive session {} - Last activity: {}, Inactive for: {} seconds, Should delete messages: {} ({} > {})",
                    session_id,
                    last_activity,
                    inactive_duration,
                    should_delete,
                    inactive_duration,
                    inactive_seconds
                );

                // Get message count for this session
                let message_count = self
                    .db
                    .collection::<mongodb::bson::Document>("chat_messages")
                    .count_documents(mongodb::bson::doc! { "session_id": session_id })
                    .await?;

                if should_delete {
                    info!(
                        "DEBUG: Session {} WILL have {} messages deleted",
                        session_id, message_count
                    );
                } else {
                    info!(
                        "DEBUG: Session {} has {} messages (NOT deleting yet)",
                        session_id, message_count
                    );
                }
            }
        }

        Ok(())
    }
}
