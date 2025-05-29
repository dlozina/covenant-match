use crate::models::error::AppError;
use mongodb::bson::{self, oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Conversation {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub participants: Vec<ObjectId>,
    pub last_message: Option<MessagePreview>,
    pub unread_counts: UnreadCounts,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct Message {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub conversation_id: ObjectId,
    pub sender_id: ObjectId,
    pub content: String,
    pub created_at: DateTime,
    pub is_read: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct MessagePreview {
    pub content: String,
    pub sender_id: ObjectId,
    pub created_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct UnreadCounts {
    pub counts: std::collections::HashMap<String, i32>,
}

#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct SendMessageRequest {
    #[validate(length(
        min = 1,
        max = 1000,
        message = "Message content must be between 1 and 1000 characters"
    ))]
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ConversationResponse {
    pub id: String,
    pub other_user: UserInfo,
    pub last_message: Option<MessagePreview>,
    pub unread_count: i32,
    pub updated_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MessageResponse {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub content: String,
    pub created_at: DateTime,
    pub is_read: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MessagesListData {
    pub messages: Vec<MessageResponse>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct MessagesListResponse {
    pub status: String,
    pub data: MessagesListData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ConversationsListData {
    pub conversations: Vec<ConversationResponse>,
    pub pagination: PaginationInfo,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ConversationsListResponse {
    pub status: String,
    pub data: ConversationsListData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UnreadCountData {
    pub total_unread: i32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UnreadCountResponse {
    pub status: String,
    pub data: UnreadCountData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PaginationInfo {
    pub total: u64,
    pub page: u64,
    pub limit: u64,
    pub total_pages: u64,
}

// Implement From traits for conversions
impl From<Message> for MessageResponse {
    fn from(message: Message) -> Self {
        MessageResponse {
            id: message.id.unwrap_or_default().to_hex(),
            conversation_id: message.conversation_id.to_hex(),
            sender_id: message.sender_id.to_hex(),
            content: message.content,
            created_at: message.created_at,
            is_read: message.is_read,
        }
    }
}

// Implement BSON serialization for MessagePreview
impl From<MessagePreview> for bson::Bson {
    fn from(preview: MessagePreview) -> Self {
        bson::to_bson(&preview).unwrap_or_default()
    }
}

// Implement BSON serialization for UnreadCounts
impl From<UnreadCounts> for bson::Bson {
    fn from(counts: UnreadCounts) -> Self {
        bson::to_bson(&counts).unwrap_or_default()
    }
}
