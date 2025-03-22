use crate::models::error::AppError;
use crate::models::session::{GameSession, SessionStatus};
use futures::TryStreamExt;
use mongodb::{
    bson::{doc, to_bson, Document},
    options::FindOptions,
    Collection, Database,
};

fn get_collection(db: &Database) -> Collection<GameSession> {
    db.collection::<GameSession>("sessions")
}

pub async fn create_session(db: &Database, session: &GameSession) -> Result<(), AppError> {
    get_collection(db).insert_one(session, None).await?;
    Ok(())
}

pub async fn find_by_id(db: &Database, id: &str) -> Result<Option<GameSession>, AppError> {
    let session = get_collection(db).find_one(doc! { "_id": id }, None).await?;
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

    let options = FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .limit(limit.map(|l| l as i64))
        .skip(offset.map(|o| o as u64))
        .build();

    let cursor = get_collection(db).find(filter, options).await?;
    let sessions = cursor.try_collect().await?;
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
        .update_one(doc! { "_id": &session.id }, update, None)
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

    get_collection(db).update_one(filter, update, None).await?;

    Ok(())
}
