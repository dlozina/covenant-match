use chrono::{DateTime, Utc};
use mongodb::bson::{doc, oid::ObjectId, Bson, Document};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Chat message model for `MongoDB`
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct ChatMessage {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String)]
    pub id: Option<ObjectId>,
    pub session_id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub content: String,
    #[schema(value_type = i64)]
    pub timestamp: DateTime<Utc>,
    pub delivered: bool,
    #[serde(default)]
    pub client_id: Option<String>,
}

impl ChatMessage {
    pub fn new(
        session_id: String,
        sender_id: String,
        sender_name: String,
        content: String,
        client_id: Option<String>,
    ) -> Self {
        Self {
            id: None,
            session_id,
            sender_id,
            sender_name,
            content,
            timestamp: Utc::now(),
            delivered: false,
            client_id,
        }
    }
}

/// Chat session model for `MongoDB`
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct ChatSession {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String)]
    pub id: Option<ObjectId>,
    pub session_id: String,
    pub participants: Vec<String>,
    #[schema(value_type = i64)]
    pub created_at: DateTime<Utc>,
    #[schema(value_type = i64)]
    pub updated_at: DateTime<Utc>,
    #[schema(value_type = i64)]
    pub last_activity: DateTime<Utc>,
    pub active: bool,
}

impl ChatSession {
    pub fn new(session_id: String, participants: Vec<String>) -> Self {
        let now = Utc::now();
        Self {
            id: None,
            session_id,
            participants,
            created_at: now,
            updated_at: now,
            last_activity: now,
            active: true,
        }
    }

    pub fn update_activity(&mut self) {
        let now = Utc::now();
        self.updated_at = now;
        self.last_activity = now;
    }
}
