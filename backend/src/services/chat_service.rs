use crate::models::chat::ChatMessage;
use crate::models::error::AppError;
use crate::repository::chat_repository;
use log::{debug, info};
use mongodb::Database;
use std::sync::Arc;

/// Service for managing chat functionality
pub struct ChatService {
    db: Arc<Database>,
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

    /// Update the last activity timestamp for a session
    pub async fn update_session_activity(&self, session_id: &str) -> Result<(), AppError> {
        debug!("Updating last activity for session: {}", session_id);
        chat_repository::update_session_activity(&self.db, session_id).await
    }

    /// Clean up inactive chat sessions
    pub async fn cleanup_inactive_sessions(&self, inactive_minutes: i64) -> Result<u64, AppError> {
        info!(
            "Cleaning up inactive chat sessions (inactive for {} minutes)",
            inactive_minutes
        );
        chat_repository::cleanup_inactive_sessions(&self.db, inactive_minutes).await
    }
}
