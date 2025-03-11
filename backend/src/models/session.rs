use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct PlayerInfo {
    pub user_id: String,
    pub username: String,
    pub character: String,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct SessionResult {
    pub user_id: String,
    pub result: GameResult,
    pub submitted_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, ToSchema)]
pub enum GameResult {
    Win,
    Loss,
    Disconnect,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, ToSchema)]
pub enum SessionStatus {
    Open,
    Full,
    InProgress,
    Completed,
    Cancelled,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameSession {
    #[serde(rename = "_id")]
    pub id: String,
    pub host_id: String,
    pub password: String,
    pub character: String,
    pub status: SessionStatus,
    pub joined_players: Vec<PlayerInfo>,
    pub results: Vec<SessionResult>,
    pub ratings: Vec<RateSessionDto>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateSessionDto {
    pub host_id: String,
    pub character: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct JoinSessionDto {
    pub user_id: String,
    pub username: String,
    pub character: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SubmitResultDto {
    pub user_id: String,
    pub result: GameResult,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct SessionResponseDto {
    pub id: String,
    pub host_id: String,
    pub status: SessionStatus,
    pub character: String,
    pub joined_players: Vec<PlayerInfo>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    // Password is only included if user is part of the session
    pub password: Option<String>,
}

impl From<GameSession> for SessionResponseDto {
    fn from(session: GameSession) -> Self {
        Self {
            id: session.id,
            host_id: session.host_id,
            status: session.status,
            character: session.character,
            joined_players: session.joined_players,
            created_at: session.created_at,
            updated_at: session.updated_at,
            started_at: session.started_at,
            completed_at: session.completed_at,
            password: None, // Default to not showing password
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct RateSessionDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    pub rating: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
    #[serde(default = "Utc::now")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct ResultsResponseDto {
    pub session_id: String,
    pub results: Vec<SessionResult>,
}
