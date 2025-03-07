use mongodb::{Database, bson::{doc, Document}, Collection, options::FindOptions};
use crate::models::session::{GameSession, SessionStatus};
use crate::models::error::AppError;
use futures::TryStreamExt;

fn get_collection(db: &Database) -> Collection<GameSession> {
    db.collection::<GameSession>("sessions")
}

pub async fn create_session(db: &Database, session: &GameSession) -> Result<(), AppError> {
    get_collection(db).insert_one(session, None).await?;
    Ok(())
}

pub async fn find_by_id(db: &Database, id: &str) -> Result<Option<GameSession>, AppError> {
    let session = get_collection(db)
        .find_one(doc! { "_id": id }, None)
        .await?;
    Ok(session)
}

pub async fn find_sessions(db: &Database, status: Option<SessionStatus>) -> Result<Vec<GameSession>, AppError> {
    let filter = match status {
        Some(status) => doc! { "status": status },
        None => doc! {},
    };
    
    let options = FindOptions::builder()
        .sort(doc! { "created_at": -1 })
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
            "character": &session.character,
            "status": &session.status,
            "joined_players": &session.joined_players,
            "results": &session.results,
            "updated_at": &session.updated_at,
            "started_at": &session.started_at,
            "completed_at": &session.completed_at,
        }
    };
    
    get_collection(db)
        .update_one(doc! { "_id": &session.id }, update, None)
        .await?;
    
    Ok(())
}
