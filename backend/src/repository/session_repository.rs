use crate::models::error::AppError;
use crate::models::session::{GameSession, SessionStatus};
use futures::TryStreamExt;
use mongodb::{
    bson::{doc, oid::ObjectId, to_bson},
    Collection, Database,
};

fn get_collection(db: &Database) -> Collection<GameSession> {
    db.collection::<GameSession>("sessions")
}

pub async fn create_session(db: &Database, session: &GameSession) -> Result<(), AppError> {
    get_collection(db).insert_one(session).await?;
    Ok(())
}

pub async fn find_by_id(db: &Database, id: &str) -> Result<Option<GameSession>, AppError> {
    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(id).map_err(|e| {
        log::error!("Invalid ObjectId format: {:?}", e);
        AppError::InvalidId
    })?;

    let session = get_collection(db)
        .find_one(doc! { "_id": object_id })
        .await?;
    Ok(session)
}

pub async fn find_sessions(
    db: &Database,
    status: Option<SessionStatus>,
    limit: Option<u64>,
    offset: Option<u64>,
    is_private: Option<bool>,
) -> Result<Vec<GameSession>, AppError> {
    let mut filter = match status {
        Some(status) => doc! { "status": to_bson(&status)? },
        None => doc! {},
    };

    if let Some(is_private) = is_private {
        filter = doc! { "$and": [filter, doc! { "is_private": is_private }] };
    }

    // Get all sessions matching the filter
    let cursor = get_collection(db).find(filter).await?;
    let mut sessions: Vec<GameSession> = cursor.try_collect().await?;

    // Manual sorting, skip and limit
    sessions.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Apply offset (skip) and limit if provided
    if let Some(offset_val) = offset {
        let offset_idx = offset_val as usize;
        if offset_idx < sessions.len() {
            sessions = sessions.into_iter().skip(offset_idx).collect();
        } else {
            sessions.clear();
        }
    }

    if let Some(limit_val) = limit {
        let limit_size = limit_val as usize;
        if sessions.len() > limit_size {
            sessions.truncate(limit_size);
        }
    }

    Ok(sessions)
}

pub async fn update_session(db: &Database, session: &GameSession) -> Result<(), AppError> {
    let update = doc! {
        "$set": {
            "host_id": &session.host_id,
            "password": &session.password,
            "night_lord": &session.night_lord,
            "status": to_bson(&session.status)?,
            "joined_players": to_bson(&session.joined_players)?,
            "results": to_bson(&session.results)?,
            "ratings": to_bson(&session.ratings)?,
            "updated_at": to_bson(&session.updated_at)?,
            "started_at": to_bson(&session.started_at)?,
            "completed_at": to_bson(&session.completed_at)?,
        }
    };

    get_collection(db)
        .update_one(doc! { "_id": &session.id }, update)
        .await?;

    Ok(())
}

pub async fn find_sessions_with_user_paginated(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<(Vec<GameSession>, u64), AppError> {
    // Find sessions where this user is a participant
    // The MongoDB document uses both userId and user_id in different places
    let filter = doc! {
        "$or": [
            { "joined_players.user_id": user_id },
            { "joined_players.userId": user_id },
            { "host_id": user_id }
        ]
    };

    // Get total count
    let total = get_collection(db).count_documents(filter.clone()).await?;

    // MongoDB 3.2.3 doesn't support options directly in find, so apply options manually
    let collection = get_collection(db);
    let cursor = collection.find(filter).await?;
    let mut sessions: Vec<GameSession> = cursor.try_collect().await?;

    // Sort, then apply pagination manually
    sessions.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    let start = page * limit;
    let end = start + limit;

    // Apply pagination manually
    if start < (sessions.len() as u64) {
        let end_idx = if end < (sessions.len() as u64) {
            end as usize
        } else {
            sessions.len()
        };
        sessions = sessions[start as usize..end_idx].to_vec();
    } else {
        sessions.clear();
    }

    Ok((sessions, total))
}

// Find session by ID
pub async fn find_session_by_id(
    db: &Database,
    id: ObjectId,
) -> Result<Option<GameSession>, AppError> {
    let collection = get_collection(db);
    let session = collection.find_one(doc! { "_id": id }).await?;
    Ok(session)
}

/// Find active sessions (Open or InProgress) for a specific user
pub async fn find_active_sessions_for_user(
    db: &Database,
    user_id: &str,
) -> Result<Vec<GameSession>, AppError> {
    // Log the user ID being used for query
    log::info!("Finding active sessions for user ID: {}", user_id);

    // Use the user_id directly as a string for comparison
    let filter = doc! {
        "$and": [
            {
                "$or": [
                    { "joined_players.user_id": user_id },
                    { "host_id": user_id }
                ]
            },
            {
                "status": {
                    "$in": [
                        to_bson(&SessionStatus::Open)?,
                        to_bson(&SessionStatus::InProgress)?
                    ]
                }
            }
        ]
    };

    let cursor = get_collection(db).find(filter).await?;
    let sessions: Vec<GameSession> = cursor.try_collect().await?;

    log::info!(
        "Found {} active sessions for user ID: {}",
        sessions.len(),
        user_id
    );

    Ok(sessions)
}

// Count sessions by status (or all sessions if status is None)
pub async fn count_sessions_by_status(
    db: &Database,
    status: Option<String>,
) -> Result<u64, AppError> {
    let filter = match status {
        Some(status_str) => doc! { "status": status_str },
        None => doc! {},
    };

    let count = get_collection(db).count_documents(filter).await?;
    Ok(count)
}
