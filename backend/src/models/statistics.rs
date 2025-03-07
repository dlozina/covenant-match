use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct CharacterStats {
    pub played: i32,
    pub wins: i32,
    pub losses: i32,
    pub disconnects: i32,
    pub win_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
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
    pub character_stats: HashMap<String, CharacterStats>,
    pub achievements: Vec<String>,
    pub reputation_score: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LeaderboardEntry {
    pub user_id: String,
    pub username: String,
    pub total_games: i32,
    pub wins: i32,
    pub win_rate: f64,
    pub reputation_score: f64,
}
