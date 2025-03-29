use crate::models::error::AppError;
use crate::models::statistics::{LeaderboardEntry, UserStatistics};
use crate::repository::session_repository;
use crate::repository::statistics_repository;
use mongodb::Database;
use serde::{Deserialize, Serialize};

// Define a simplified session history structure
#[derive(Serialize, Deserialize, Debug)]
pub struct SessionHistoryEntry {
    pub session_id: String,
    pub session_name: String,
    pub night_lord: String,
    pub player_nightfarer: String,
    pub player_result: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

// Pagination response structure
#[derive(Serialize, Deserialize, Debug)]
pub struct PaginationInfo {
    pub page: u64,
    pub limit: u64,
    pub total: u64,
    pub total_pages: u64,
}

// Paginated response wrapper
#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedSessionHistory {
    pub pagination: PaginationInfo,
    pub sessions: Vec<SessionHistoryEntry>,
}

pub async fn get_user_statistics(
    db: &Database,
    user_id: &str,
) -> Result<Option<UserStatistics>, AppError> {
    statistics_repository::find_by_user_id(db, user_id).await
}

pub async fn get_all_user_statistics(db: &Database) -> Result<Vec<UserStatistics>, AppError> {
    statistics_repository::find_all(db).await
}

pub async fn get_leaderboard(db: &Database, limit: i64) -> Result<Vec<LeaderboardEntry>, AppError> {
    statistics_repository::get_leaderboard(db, limit).await
}

// User session history with pagination
pub async fn get_user_session_history_paginated(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<PaginatedSessionHistory, AppError> {
    // Get paginated sessions
    let (sessions, total) =
        session_repository::find_sessions_with_user_paginated(db, user_id, page, limit).await?;

    // Calculate total pages
    let total_pages = if total == 0 {
        0
    } else {
        (total as f64 / limit as f64).ceil() as u64
    };

    // Transform sessions into a simplified format
    let history: Vec<SessionHistoryEntry> = sessions
        .into_iter()
        .filter_map(|session| {
            // Find this user in the joined players
            let player = session
                .joined_players
                .iter()
                .find(|p| p.user_id == user_id)?;

            // Find this user's result if available
            let result = session
                .results
                .iter()
                .find(|r| r.user_id == user_id)
                .map_or_else(|| "Unknown".to_string(), |r| format!("{:?}", r.result));

            // Convert ObjectId to hex string
            let session_id = session.id.to_hex();

            // Convert MongoDB DateTime to Chrono DateTime
            let created_at =
                chrono::DateTime::from_timestamp(session.created_at.timestamp_millis() / 1000, 0)
                    .unwrap_or_else(|| chrono::Utc::now());

            let completed_at = session.completed_at.map(|dt| {
                chrono::DateTime::from_timestamp(dt.timestamp_millis() / 1000, 0)
                    .unwrap_or_else(|| chrono::Utc::now())
            });

            Some(SessionHistoryEntry {
                session_id,
                session_name: session.name,
                night_lord: session.night_lord,
                player_nightfarer: player.nightfarer.clone(),
                player_result: result,
                created_at,
                completed_at,
            })
        })
        .collect();

    // Create pagination info
    let pagination = PaginationInfo {
        page,
        limit,
        total,
        total_pages,
    };

    Ok(PaginatedSessionHistory {
        pagination,
        sessions: history,
    })
}
