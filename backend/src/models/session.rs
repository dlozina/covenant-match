use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use std::fmt;
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct PlayerInfo {
    #[serde(alias = "user_id")]
    pub user_id: String,
    pub username: String,
    pub nightfarer: String,
    pub covenant_name: String,
    pub region: String,
    pub platform: String,
    pub experience: String,
    #[serde(alias = "joined_at")]
    pub joined_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlayerInfoResponseDto {
    #[serde(alias = "user_id")]
    pub user_id: String,
    pub username: String,
    pub nightfarer: String,
    pub covenant_name: String,
    pub region: String,
    pub platform: String,
    pub experience: String,
    #[serde(alias = "joined_at")]
    pub joined_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct SessionResult {
    #[serde(alias = "user_id")]
    pub user_id: String,
    pub result: GameResult,
    pub rating: Option<u8>,
    pub feedback: Option<String>,
    #[serde(alias = "submitted_at")]
    pub submitted_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SessionResultResponseDto {
    #[serde(alias = "user_id")]
    pub user_id: String,
    pub result: GameResult,
    pub rating: Option<u8>,
    pub feedback: Option<String>,
    #[serde(alias = "submitted_at")]
    pub submitted_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, ToSchema)]
pub enum GameResult {
    Win,
    Loss,
    Disconnect,
}

// Implement Display for GameResult
impl fmt::Display for GameResult {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            GameResult::Win => write!(f, "Win"),
            GameResult::Loss => write!(f, "Loss"),
            GameResult::Disconnect => write!(f, "Disconnect"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, ToSchema)]
pub enum SessionStatus {
    Open,
    Full,
    InProgress,
    Completed,
    Cancelled,
}

// Implement Display for SessionStatus
impl fmt::Display for SessionStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SessionStatus::Open => write!(f, "Open"),
            SessionStatus::Full => write!(f, "Full"),
            SessionStatus::InProgress => write!(f, "In Progress"),
            SessionStatus::Completed => write!(f, "Completed"),
            SessionStatus::Cancelled => write!(f, "Cancelled"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameSession {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub name: String,
    pub host_id: String,
    pub region: String,
    pub platform: String,
    pub password: String,
    pub is_private: bool,
    pub is_friends_only: bool,
    pub night_lord: String,
    pub status: SessionStatus,
    pub joined_players: Vec<PlayerInfo>,
    pub results: Vec<SessionResult>,
    pub ratings: Vec<RateSessionDto>,
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub started_at: Option<DateTime>,
    pub completed_at: Option<DateTime>,
    pub stats_updated: bool,
    pub new_session_created: bool,
    pub new_session_created_id: Option<ObjectId>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionDto {
    pub name: String,
    pub region: String,
    pub platform: String,
    pub game_password: String,
    pub nightfarer: String,
    pub night_lord: String,
    pub is_private: bool,
    pub is_friends_only: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionDto {
    pub night_lord: Option<String>,
    pub host_nightfarer: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct JoinSessionDto {
    pub user_id: String,
    pub username: String,
    pub nightfarer: String,
    pub covenant_name: String,
    pub region: String,
    pub experience: String,
    pub platform: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SubmitResultDto {
    pub user_id: String,
    pub result: GameResult,
    pub rating: Option<u8>,
    pub feedback: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SessionResponseDto {
    pub id: String,
    pub name: String,
    pub host_id: String,
    pub region: String,
    pub platform: String,
    pub status: SessionStatus,
    pub night_lord: String,
    pub joined_players: Vec<PlayerInfoResponseDto>,
    pub results: Vec<SessionResultResponseDto>,
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub started_at: Option<DateTime>,
    pub completed_at: Option<DateTime>,
    pub password: String,
    pub is_private: bool,
    pub stats_updated: bool,
    pub new_session_created: bool,
    #[schema(value_type = String)]
    pub new_session_created_id: Option<ObjectId>,
}

impl From<GameSession> for SessionResponseDto {
    fn from(session: GameSession) -> Self {
        Self {
            id: session.id.to_hex(),
            name: session.name,
            host_id: session.host_id,
            region: session.region,
            platform: session.platform,
            status: session.status,
            night_lord: session.night_lord,
            joined_players: session
                .joined_players
                .into_iter()
                .map(|player| PlayerInfoResponseDto {
                    user_id: player.user_id,
                    username: player.username,
                    nightfarer: player.nightfarer,
                    covenant_name: player.covenant_name,
                    region: player.region,
                    platform: player.platform,
                    experience: player.experience,
                    joined_at: player.joined_at,
                })
                .collect(),
            results: session
                .results
                .into_iter()
                .map(|result| SessionResultResponseDto {
                    user_id: result.user_id,
                    result: result.result,
                    rating: result.rating,
                    feedback: result.feedback,
                    submitted_at: result.submitted_at,
                })
                .collect(),
            created_at: session.created_at,
            updated_at: session.updated_at,
            started_at: session.started_at,
            completed_at: session.completed_at,
            password: session.password,
            is_private: session.is_private,
            stats_updated: session.stats_updated,
            new_session_created: session.new_session_created,
            new_session_created_id: session.new_session_created_id,
        }
    }
}

/// Combined review DTO for submitting results, ratings, and feedback in one request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SessionReviewDto {
    pub result: Option<String>,   // win, loss, d/c.
    pub rating: Option<i32>,      // 1-5 stars
    pub feedback: Option<String>, // Optional text feedback
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RateSessionDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    pub rating: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    pub created_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ResultsResponseDto {
    pub session_id: String,
    pub results: Vec<SessionResult>,
}

/// Minimal session data for public listing
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimalSessionDto {
    pub id: String,
    pub name: String,
    pub host_name: String,
    pub status: SessionStatus,
    pub created_at: DateTime,
}

/// Statistics by covenant
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CovenantStats {
    pub covenant_name: String,
    pub wins: i32,
    pub losses: i32,
    pub disconnects: i32,
}

/// Response for covenant statistics
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CovenantStatsResponse {
    pub covenant_stats: Vec<CovenantStats>,
}
