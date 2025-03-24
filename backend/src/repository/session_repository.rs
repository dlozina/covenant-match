use crate::models::error::AppError;
use crate::models::session::{GameSession, SessionStatus};
use futures::TryStreamExt;
use mongodb::{
    bson::{doc, to_bson, Document},
    options::{FindOptions, ReplaceOptions, UpdateOptions},
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
    let session = get_collection(db).find_one(doc! { "_id": id }).await?;
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

pub async fn update_player_character(
    db: &Database,
    session_id: &str,
    user_id: &str,
    new_character: &str,
) -> Result<(), AppError> {
    let filter = doc! {
        "_id": session_id,
        "joined_players.user_id": user_id
    };
    let update = doc! {
        "$set": { "joined_players.$.nightfarer": new_character }
    };

    get_collection(db).update_one(filter, update).await?;

    Ok(())
}
