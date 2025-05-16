use crate::models::error::AppError;
use crate::models::statistics::{LeaderboardEntryResponseDto, UserStatistics, UserStatsResponse};
use crate::repository::statistics_repository;
use crate::repository::{session_repository, user_repository};
use crate::routes::statistics::{PlayerDetail, SessionDetail};
use futures::stream::TryStreamExt;
use mongodb::{bson::doc, bson::oid::ObjectId, Database};
use serde::{Deserialize, Serialize};
use std::collections::HashMap; // For try_collect

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

pub async fn get_leaderboard(
    db: &Database,
    limit: i64,
) -> Result<Vec<LeaderboardEntryResponseDto>, AppError> {
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
                    .unwrap_or_else(chrono::Utc::now);

            let completed_at = session.completed_at.map(|dt| {
                chrono::DateTime::from_timestamp(dt.timestamp_millis() / 1000, 0)
                    .unwrap_or_else(chrono::Utc::now)
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

// User session history with pagination and filtering
pub async fn get_user_session_history_filtered(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
    filters: HashMap<String, Option<String>>,
) -> Result<PaginatedSessionHistory, AppError> {
    // Find sessions where this user is a participant
    // The MongoDB document uses both userId and user_id in different places
    let mut filter = doc! {
        "$or": [
            { "joined_players.user_id": user_id },
            { "joined_players.userId": user_id },
            { "host_id": user_id }
        ]
    };

    // Apply additional filters if they contain values
    if let Some(night_lord) = filters.get("night_lord").cloned().flatten() {
        filter = doc! {
            "$and": [
                filter,
                { "night_lord": night_lord }
            ]
        };
    }

    if let Some(nightfarer) = filters.get("nightfarer").cloned().flatten() {
        filter = doc! {
            "$and": [
                filter,
                {
                    "$or": [
                        // Check both nightfarer and Nightfarer fields to handle case variations
                        { "joined_players.nightfarer": nightfarer },
                    ]
                }
            ]
        };
    }

    // For result filtering, we need to look at the results array
    if let Some(result_filter) = filters.get("result").cloned().flatten() {
        filter = doc! {
            "$and": [
                filter,
                {
                    "results": {
                        "$elemMatch": {
                            "user_id": user_id,
                            "result": result_filter
                        }
                    }
                }
            ]
        };
    }

    // Get total count
    let total = session_repository::get_collection(db)
        .count_documents(filter.clone())
        .await?;

    // Get the sessions with pagination
    let collection = session_repository::get_collection(db);
    let cursor = collection.find(filter).await?;
    let mut sessions: Vec<crate::models::session::GameSession> = cursor.try_collect().await?;

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
                    .unwrap_or_else(chrono::Utc::now);

            let completed_at = session.completed_at.map(|dt| {
                chrono::DateTime::from_timestamp(dt.timestamp_millis() / 1000, 0)
                    .unwrap_or_else(chrono::Utc::now)
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
    let total_pages = if total == 0 {
        0
    } else {
        (total as f64 / limit as f64).ceil() as u64
    };

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

// Get detailed information for a specific session
pub async fn get_session_details(
    db: &Database,
    session_id: &str,
    requesting_user_id: &str,
) -> Result<Option<SessionDetail>, AppError> {
    // Convert session_id string to ObjectId
    let Ok(obj_id) = ObjectId::parse_str(session_id) else {
        return Err(AppError::InvalidObjectId(session_id.to_string()));
    };

    // Get the session from the repository
    let Some(session) = session_repository::find_session_by_id(db, obj_id).await? else {
        return Ok(None);
    };

    // Verify the user is a participant in this session
    let is_participant = session
        .joined_players
        .iter()
        .any(|p| p.user_id == requesting_user_id)
        || session.host_id == requesting_user_id;

    if !is_participant {
        return Ok(None); // Don't expose session details to non-participants
    }

    // Map results to a hashmap for easier lookup
    let result_map = session
        .results
        .iter()
        .map(|r| (r.user_id.clone(), r.result.to_string()))
        .collect::<std::collections::HashMap<_, _>>();

    // Create PlayerDetail objects for each player
    let mut players = Vec::new();

    // First add the host (even if they're also in joined_players)
    if let Some(host) = session
        .joined_players
        .iter()
        .find(|p| p.user_id == session.host_id)
    {
        let result = result_map.get(&host.user_id).map(ToString::to_string);

        // Convert MongoDB DateTime to chrono DateTime
        let joined_at_chrono =
            chrono::DateTime::from_timestamp(host.joined_at.timestamp_millis() / 1000, 0)
                .unwrap_or_else(chrono::Utc::now);

        players.push(PlayerDetail {
            user_id: host.user_id.clone(),
            username: host.username.clone(),
            nightfarer: host.nightfarer.clone(),
            result,
            joined_at: joined_at_chrono,
        });
    }

    // Add remaining participants
    for player in session
        .joined_players
        .iter()
        .filter(|p| p.user_id != session.host_id)
    {
        let result = result_map.get(&player.user_id).map(ToString::to_string);

        // Convert MongoDB DateTime to chrono DateTime
        let joined_at_chrono =
            chrono::DateTime::from_timestamp(player.joined_at.timestamp_millis() / 1000, 0)
                .unwrap_or_else(chrono::Utc::now);

        players.push(PlayerDetail {
            user_id: player.user_id.clone(),
            username: player.username.clone(),
            nightfarer: player.nightfarer.clone(),
            result,
            joined_at: joined_at_chrono,
        });
    }

    // Sort players by join time
    players.sort_by(|a, b| a.joined_at.cmp(&b.joined_at));

    // Convert MongoDB DateTime to chrono DateTime for created_at
    let created_at_chrono =
        chrono::DateTime::from_timestamp(session.created_at.timestamp_millis() / 1000, 0)
            .unwrap_or_else(chrono::Utc::now);

    // Convert MongoDB DateTime to chrono DateTime for completed_at if it exists
    let completed_at_chrono = session.completed_at.map(|dt| {
        chrono::DateTime::from_timestamp(dt.timestamp_millis() / 1000, 0)
            .unwrap_or_else(chrono::Utc::now)
    });

    // Create the session detail
    let session_detail = SessionDetail {
        session_id: session.id.to_hex(),
        session_name: session.name,
        night_lord: session.night_lord,
        created_at: created_at_chrono,
        completed_at: completed_at_chrono,
        status: session.status.to_string(),
        players,
    };

    Ok(Some(session_detail))
}

pub async fn get_batch_user_stats(
    db: &Database,
    user_ids: &[String],
) -> Result<Vec<UserStatsResponse>, AppError> {
    // Collect statistics for each user
    let mut stats_collection = Vec::new();

    for user_id in user_ids {
        // Get user statistics
        match get_user_statistics(&db, user_id).await {
            Ok(Some(stats)) => {
                // Get user details for additional info
                match user_repository::find_user_by_id(&db, user_id).await {
                    Ok(Some(user)) => {
                        stats_collection.push(UserStatsResponse {
                            user_id: user_id.clone(),
                            username: user.username,
                            platform: user.platform,
                            experience: user.experience.to_string(),
                            covenant_name: user.covenant_name,
                            total_games: stats.total_games,
                            wins: stats.wins,
                            losses: stats.losses,
                            win_rate: stats.win_rate,
                            score: stats.reputation_score,
                        });
                    }
                    Ok(None) => {
                        // User not found in users collection but has stats
                        stats_collection.push(UserStatsResponse {
                            user_id: user_id.clone(),
                            username: "Unknown".to_string(),
                            platform: "Unknown".to_string(),
                            experience: "Unknown".to_string(),
                            covenant_name: "Unknown".to_string(),
                            total_games: stats.total_games,
                            wins: stats.wins,
                            losses: stats.losses,
                            win_rate: stats.win_rate,
                            score: stats.reputation_score,
                        });
                    }
                    Err(e) => {
                        log::error!("Error fetching user details: {:?}", e);
                    }
                }
            }
            Ok(None) => {
                log::debug!("No statistics found for user: {}", user_id);
            }
            Err(e) => {
                log::error!("Error fetching user statistics: {:?}", e);
            }
        }
    }

    Ok(stats_collection)
}
