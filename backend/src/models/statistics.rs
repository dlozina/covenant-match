use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use utoipa::ToSchema;
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Stats {
    pub played: i32,
    pub wins: i32,
    pub losses: i32,
    pub disconnects: i32,
    pub win_rate: f64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UserStatistics {
    #[serde(rename = "_id")]
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub total_games: i32,
    pub wins: i32,
    pub losses: i32,
    pub disconnects: i32,
    pub win_rate: f64,
    pub score: f64,
    pub nightfarer_stats: HashMap<String, Stats>,
    pub night_lord_stats: HashMap<String, Stats>,
    pub covenant_stats: HashMap<String, Stats>,
    pub achievements: Vec<String>,
    pub reputation_score: f64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardEntryResponseDto {
    pub user_id: String,
    pub username: String,
    pub total_games: i32,
    pub wins: i32,
    pub win_rate: f64,
    pub reputation_score: f64,
    pub score: f64,
}

#[derive(Serialize, ToSchema)]
pub struct NightLordStatsResponse {
    pub name: String,
    pub played: i32,
    pub wins: i32,
    pub losses: i32,
    pub disconnects: i32,
    pub win_rate: f64,
}

// Add a new response type for session history
#[derive(Serialize, ToSchema)]
pub struct SessionHistoryResponse {
    pub session_id: String,
    pub session_name: String,
    pub night_lord: String,
    pub player_nightfarer: String,
    pub player_result: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

// Response structure for paginated session history
#[derive(Serialize, ToSchema)]
pub struct PaginatedSessionResponse {
    pub status: String,
    pub data: PaginatedSessionData,
}

#[derive(Serialize, ToSchema)]
pub struct PaginatedSessionData {
    pub pagination: PaginationInfo,
    pub sessions: Vec<SessionHistoryResponse>,
}

#[derive(Serialize, ToSchema)]
pub struct PaginationInfo {
    pub page: u64,
    pub limit: u64,
    pub total: u64,
    pub total_pages: u64,
}

// Query parameters for pagination
#[derive(Deserialize)]
pub struct PaginationQuery {
    pub page: Option<u64>,
    pub limit: Option<u64>,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserStatsResponse {
    pub user_id: String,
    pub username: String,
    pub platform: String,
    pub experience: String,
    pub covenant_name: String,
    pub total_games: i32,
    pub wins: i32,
    pub losses: i32,
    pub win_rate: f64,
    pub score: f64,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BatchUserStatsResponse {
    pub status: String,
    pub data: Vec<UserStatsResponse>,
    pub not_found_users: Option<Vec<String>>,
}