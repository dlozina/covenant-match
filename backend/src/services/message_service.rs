use crate::models::error::AppError;
use crate::models::message::{
    Conversation, ConversationResponse, Message, MessagePreview, MessageResponse, MessagesListData,
    MessagesListResponse, PaginationInfo, SendMessageRequest, UnreadCountData, UnreadCountResponse,
    UnreadCounts, UserInfo,
};
use crate::models::user::User;
use crate::repository::{message_repository, user_repository};
use log::{error, info};
use mongodb::bson::{oid::ObjectId, DateTime as MongoDateTime};
use mongodb::Database;
use std::collections::HashMap;

/// Get all conversations for a user with pagination
pub async fn get_user_conversations(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<(Vec<ConversationResponse>, PaginationInfo), AppError> {
    // First verify the user exists
    let user = user_repository::find_user_by_id(db, user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    // Get conversations with pagination
    let conversations =
        message_repository::get_user_conversations(db, user_id, page, limit).await?;

    // Get total count for pagination
    let total = message_repository::count_user_conversations(db, user_id).await?;

    // Convert to response format
    let mut response = Vec::new();
    for conversation in conversations {
        // Get the other user's ID (not the current user)
        let other_user_id = conversation
            .participants
            .iter()
            .find(|&&id| id != user.id)
            .ok_or(AppError::ConversationNotFound)?;

        // Get other user's info
        let other_user = user_repository::find_user_by_id(db, &other_user_id.to_hex())
            .await?
            .ok_or(AppError::ConversationNotFound)?;

        // Get unread count for this conversation
        let unread_count = message_repository::get_conversation_unread_count(
            db,
            user_id,
            &conversation
                .id
                .map_or_else(|| "".to_string(), |id| id.to_hex()),
        )
        .await?;

        response.push(ConversationResponse {
            id: conversation.id.map(|id| id.to_hex()).unwrap_or_default(),
            other_user: UserInfo {
                id: other_user.id.to_hex(),
                username: other_user.username,
                avatar_url: other_user.avatar_url,
            },
            last_message: conversation.last_message,
            unread_count,
            updated_at: conversation.updated_at,
        });
    }

    // Calculate pagination info
    let total_pages = if limit > 0 {
        (total + limit - 1) / limit
    } else {
        0
    };
    let pagination = PaginationInfo {
        total,
        page,
        limit,
        total_pages,
    };

    Ok((response, pagination))
}

/// Count total conversations for a user
pub async fn count_user_conversations(db: &Database, user_id: &str) -> Result<u64, AppError> {
    message_repository::count_user_conversations(db, user_id).await
}

/// Get messages in a conversation with pagination
pub async fn get_conversation_messages(
    db: &Database,
    conversation_id: &str,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<MessagesListResponse, AppError> {
    // Verify conversation exists and user is a participant
    let conversation = message_repository::find_conversation_by_id(db, conversation_id)
        .await?
        .ok_or(AppError::ConversationNotFound)?;

    if !conversation
        .participants
        .iter()
        .any(|id| id.to_hex() == user_id)
    {
        return Err(AppError::Unauthorized);
    }

    // Get messages from repository
    let messages =
        message_repository::get_conversation_messages(db, conversation_id, page, limit).await?;

    // Get total count for pagination
    let total = message_repository::count_conversation_messages(db, conversation_id).await?;

    // Convert messages to response format
    let message_responses: Vec<MessageResponse> =
        messages.into_iter().map(MessageResponse::from).collect();

    // Calculate total pages
    let total_pages = if limit > 0 { total.div_ceil(limit) } else { 0 };

    // Create pagination info
    let pagination = PaginationInfo {
        total,
        page,
        limit,
        total_pages,
    };

    // Create response
    Ok(MessagesListResponse {
        status: "success".to_string(),
        data: MessagesListData {
            messages: message_responses,
            pagination,
        },
    })
}

/// Send a message in a conversation
pub async fn send_message(
    db: &Database,
    conversation_id: &str,
    sender_id: &str,
    content: &str,
) -> Result<MessageResponse, AppError> {
    // Verify conversation exists and sender is a participant
    let conversation = message_repository::find_conversation_by_id(db, conversation_id)
        .await?
        .ok_or(AppError::ConversationNotFound)?;

    if !conversation
        .participants
        .iter()
        .any(|id| id.to_hex() == sender_id)
    {
        return Err(AppError::Unauthorized);
    }

    // Create new message
    let now = mongodb::bson::DateTime::now();
    let message = Message {
        id: Some(ObjectId::new()),
        conversation_id: ObjectId::parse_str(conversation_id).map_err(|_| AppError::InvalidId)?,
        sender_id: ObjectId::parse_str(sender_id).map_err(|_| AppError::InvalidId)?,
        content: content.to_string(),
        created_at: now,
        is_read: false,
    };

    // Save message
    let saved_message = message_repository::create_message(db, &message).await?;

    // Update conversation metadata
    let last_message = MessagePreview {
        content: content.to_string(),
        sender_id: saved_message.sender_id,
        created_at: saved_message.created_at,
    };

    // Update unread counts
    let mut unread_counts = conversation.unread_counts;
    for participant_id in &conversation.participants {
        let pid = participant_id.to_hex();
        if pid != sender_id {
            let count = unread_counts.counts.entry(pid).or_insert(0);
            *count += 1;
        }
    }

    // Update conversation
    message_repository::update_conversation_metadata(
        db,
        conversation_id,
        last_message,
        unread_counts,
    )
    .await?;

    Ok(MessageResponse::from(saved_message))
}

/// Mark all messages in a conversation as read
pub async fn mark_messages_as_read(
    db: &Database,
    conversation_id: &str,
    user_id: &str,
) -> Result<(), AppError> {
    // Verify conversation exists and user is a participant
    let conversation = message_repository::find_conversation_by_id(db, conversation_id)
        .await?
        .ok_or(AppError::ConversationNotFound)?;

    if !conversation
        .participants
        .iter()
        .any(|id| id.to_hex() == user_id)
    {
        return Err(AppError::Unauthorized);
    }

    // Mark messages as read
    message_repository::mark_messages_as_read(db, conversation_id, user_id).await?;

    // Update conversation unread counts
    let mut unread_counts = conversation.unread_counts;
    unread_counts.counts.insert(user_id.to_string(), 0);

    // Update conversation metadata
    message_repository::update_conversation_metadata(
        db,
        conversation_id,
        conversation.last_message.unwrap_or_else(|| MessagePreview {
            content: String::new(),
            sender_id: ObjectId::new(),
            created_at: mongodb::bson::DateTime::now(),
        }),
        unread_counts,
    )
    .await
}

/// Get or create a conversation with a friend
pub async fn get_or_create_conversation(
    db: &Database,
    user_id: &str,
    friend_id: &str,
) -> Result<ConversationResponse, AppError> {
    let user = user_repository::find_user_by_id(db, user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;
    let friend = user_repository::find_user_by_id(db, friend_id)
        .await?
        .ok_or(AppError::UserNotFound)?;
    let user_object_id = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let friend_object_id = ObjectId::parse_str(friend_id).map_err(|_| AppError::InvalidId)?;
    let conversation =
        message_repository::find_conversation_between_users(db, user_id, friend_id).await?;
    match conversation {
        Some(conversation) => Ok(ConversationResponse {
            id: conversation.id.map(|id| id.to_hex()).unwrap_or_default(),
            other_user: UserInfo {
                id: friend.id.to_hex(),
                username: friend.username,
                avatar_url: friend.avatar_url,
            },
            last_message: conversation.last_message,
            unread_count: conversation
                .unread_counts
                .counts
                .get(user_id)
                .copied()
                .unwrap_or(0),
            updated_at: conversation.updated_at,
        }),
        None => {
            let mut unread_counts = HashMap::new();
            unread_counts.insert(user_id.to_string(), 0);
            unread_counts.insert(friend_id.to_string(), 0);
            let conversation = Conversation {
                id: None,
                participants: vec![user_object_id, friend_object_id],
                last_message: None,
                unread_counts: UnreadCounts {
                    counts: unread_counts,
                },
                created_at: MongoDateTime::now(),
                updated_at: MongoDateTime::now(),
            };
            let conversation = message_repository::create_conversation(db, &conversation).await?;
            Ok(ConversationResponse {
                id: conversation.id.map(|id| id.to_hex()).unwrap_or_default(),
                other_user: UserInfo {
                    id: friend.id.to_hex(),
                    username: friend.username,
                    avatar_url: friend.avatar_url,
                },
                last_message: None,
                unread_count: 0,
                updated_at: conversation.updated_at,
            })
        }
    }
}

/// Get total unread message count for a user
pub async fn get_user_unread_count(
    db: &Database,
    user_id: &str,
) -> Result<UnreadCountResponse, AppError> {
    // Verify user exists
    if user_repository::find_user_by_id(db, user_id)
        .await?
        .is_none()
    {
        return Err(AppError::UserNotFound);
    }

    // Get unread count
    let total_unread = message_repository::get_user_unread_count(db, user_id).await?;

    Ok(UnreadCountResponse {
        status: "success".to_string(),
        data: UnreadCountData { total_unread },
    })
}
