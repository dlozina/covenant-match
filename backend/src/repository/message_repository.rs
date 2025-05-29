use crate::models::error::AppError;
use crate::models::message::{Conversation, Message, MessagePreview, UnreadCounts};
use futures::{StreamExt, TryStreamExt};
use log::error;
use mongodb::{
    bson::{doc, oid::ObjectId, DateTime},
    Collection, Database,
};

const CONVERSATIONS_COLLECTION: &str = "conversations";
const MESSAGES_COLLECTION: &str = "messages";

fn get_conversations_collection(db: &Database) -> Collection<Conversation> {
    db.collection::<Conversation>(CONVERSATIONS_COLLECTION)
}

fn get_messages_collection(db: &Database) -> Collection<Message> {
    db.collection::<Message>(MESSAGES_COLLECTION)
}

/// Create a new conversation
pub async fn create_conversation(
    db: &Database,
    conversation: &Conversation,
) -> Result<Conversation, AppError> {
    let collection = get_conversations_collection(db);
    collection.insert_one(conversation).await.map_err(|e| {
        error!("Database error creating conversation: {:?}", e);
        AppError::DatabaseError(e)
    })?;
    Ok(conversation.clone())
}

/// Find a conversation by its ID
pub async fn find_conversation_by_id(
    db: &Database,
    conversation_id: &str,
) -> Result<Option<Conversation>, AppError> {
    let collection = get_conversations_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(conversation_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! { "_id": object_id };

    collection.find_one(filter).await.map_err(|e| {
        error!("Database error finding conversation: {:?}", e);
        AppError::DatabaseError(e)
    })
}

/// Find a conversation between two users
pub async fn find_conversation_between_users(
    db: &Database,
    user_id_1: &str,
    user_id_2: &str,
) -> Result<Option<Conversation>, AppError> {
    let collection = get_conversations_collection(db);

    // Convert string IDs to ObjectId
    let object_id_1 = ObjectId::parse_str(user_id_1).map_err(|_| AppError::InvalidId)?;
    let object_id_2 = ObjectId::parse_str(user_id_2).map_err(|_| AppError::InvalidId)?;

    // Sort participant IDs to ensure consistent querying
    let participants = if object_id_1 < object_id_2 {
        vec![object_id_1, object_id_2]
    } else {
        vec![object_id_2, object_id_1]
    };

    let filter = doc! { "participants": participants };

    collection.find_one(filter).await.map_err(|e| {
        error!("Database error finding conversation between users: {:?}", e);
        AppError::DatabaseError(e)
    })
}

/// Get all conversations for a user with pagination
pub async fn get_user_conversations(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<Vec<Conversation>, AppError> {
    let collection = get_conversations_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    // Use $in operator to search in participants array
    let filter = doc! { "participants": { "$in": [object_id] } };

    // Calculate skip value for pagination, ensuring page is at least 1
    let skip = if page > 0 { (page - 1) * limit } else { 0 };

    let mut cursor = collection
        .find(filter)
        .sort(doc! { "updated_at": -1 }) // Sort by most recent
        .skip(skip)
        .limit(limit as i64)
        .await
        .map_err(|e| {
            error!("Database error getting user conversations: {:?}", e);
            AppError::DatabaseError(e)
        })?;

    let mut conversations = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(conversation) => conversations.push(conversation),
            Err(e) => return Err(AppError::DatabaseError(e)),
        }
    }

    Ok(conversations)
}

/// Count total conversations for a user
pub async fn count_user_conversations(db: &Database, user_id: &str) -> Result<u64, AppError> {
    let collection = get_conversations_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    // Use $in operator to search in participants array
    let filter = doc! { "participants": { "$in": [object_id] } };

    collection.count_documents(filter).await.map_err(|e| {
        error!("Database error counting user conversations: {:?}", e);
        AppError::DatabaseError(e)
    })
}

/// Create a new message
pub async fn create_message(db: &Database, message: &Message) -> Result<Message, AppError> {
    let collection = get_messages_collection(db);
    collection.insert_one(message).await.map_err(|e| {
        error!("Database error creating message: {:?}", e);
        AppError::DatabaseError(e)
    })?;
    Ok(message.clone())
}

/// Get messages in a conversation with pagination
pub async fn get_conversation_messages(
    db: &Database,
    conversation_id: &str,
    page: u64,
    limit: u64,
) -> Result<Vec<Message>, AppError> {
    let collection = get_messages_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(conversation_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! { "conversation_id": object_id };

    // Calculate skip value for pagination
    let skip = (page - 1) * limit;

    let mut cursor = collection
        .find(filter)
        .sort(doc! { "created_at": -1 }) // Sort by most recent
        .skip(skip)
        .limit(limit as i64)
        .await
        .map_err(|e| {
            error!("Database error getting conversation messages: {:?}", e);
            AppError::DatabaseError(e)
        })?;

    let mut messages = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(message) => messages.push(message),
            Err(e) => return Err(AppError::DatabaseError(e)),
        }
    }

    Ok(messages)
}

/// Count total messages in a conversation
pub async fn count_conversation_messages(
    db: &Database,
    conversation_id: &str,
) -> Result<u64, AppError> {
    let collection = get_messages_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(conversation_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! { "conversation_id": object_id };

    collection.count_documents(filter).await.map_err(|e| {
        error!("Database error counting conversation messages: {:?}", e);
        AppError::DatabaseError(e)
    })
}

/// Update conversation's last message and unread counts
pub async fn update_conversation_metadata(
    db: &Database,
    conversation_id: &str,
    last_message: MessagePreview,
    unread_counts: UnreadCounts,
) -> Result<(), AppError> {
    let collection = get_conversations_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(conversation_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! { "_id": object_id };
    let update = doc! {
        "$set": {
            "last_message": last_message,
            "unread_counts": unread_counts,
            "updated_at": DateTime::now()
        }
    };

    collection.update_one(filter, update).await.map_err(|e| {
        error!("Database error updating conversation metadata: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(())
}

/// Mark all messages in a conversation as read for a specific user
pub async fn mark_messages_as_read(
    db: &Database,
    conversation_id: &str,
    user_id: &str,
) -> Result<(), AppError> {
    let collection = get_messages_collection(db);

    // Convert string IDs to ObjectId
    let conversation_object_id =
        ObjectId::parse_str(conversation_id).map_err(|_| AppError::InvalidId)?;
    let user_object_id = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! {
        "conversation_id": conversation_object_id,
        "sender_id": { "$ne": user_object_id },
        "is_read": false
    };

    let update = doc! {
        "$set": { "is_read": true }
    };

    collection.update_many(filter, update).await.map_err(|e| {
        error!("Database error marking messages as read: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(())
}

/// Get total unread message count for a user
pub async fn get_user_unread_count(db: &Database, user_id: &str) -> Result<i32, AppError> {
    let collection = get_messages_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! {
        "sender_id": { "$ne": object_id },
        "is_read": false
    };

    collection
        .count_documents(filter)
        .await
        .map(|count| count as i32)
        .map_err(|e| {
            error!("Database error getting unread count: {:?}", e);
            AppError::DatabaseError(e)
        })
}

/// Get unread message count for a conversation
pub async fn get_conversation_unread_count(
    db: &Database,
    user_id: &str,
    conversation_id: &str,
) -> Result<i32, AppError> {
    let collection = get_conversations_collection(db);

    // Convert string IDs to ObjectId
    let object_id = ObjectId::parse_str(conversation_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! { "_id": object_id };

    let conversation = collection.find_one(filter).await.map_err(|e| {
        error!("Database error getting conversation unread count: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(conversation
        .map(|c| c.unread_counts.counts.get(user_id).copied().unwrap_or(0))
        .unwrap_or(0))
}
