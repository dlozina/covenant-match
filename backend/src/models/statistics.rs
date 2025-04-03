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
    pub nightfarer_stats: HashMap<String, Stats>,
    pub night_lord_stats: HashMap<String, Stats>,
    pub covenant_stats: HashMap<String, Stats>,
    pub achievements: Vec<String>,
    pub reputation_score: f64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LeaderboardEntry {
    pub user_id: String,
    pub username: String,
    pub total_games: i32,
    pub wins: i32,
    pub win_rate: f64,
    pub reputation_score: f64,
}
