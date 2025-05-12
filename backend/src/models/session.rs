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

// todo: dangerous, we should use a enum for this
// Implement Display for SessionStatus
impl fmt::Display for SessionStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SessionStatus::Open => write!(f, "Open"),
            SessionStatus::Full => write!(f, "Full"),
            SessionStatus::InProgress => write!(f, "InProgress"),
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
    pub host_experience: String,
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

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SessionResponseDto {
    pub id: String,
    pub name: String,
    pub host_id: String,
    pub host_name: String,
    pub host_experience: String,
    pub password: String,
    pub status: String,
    pub is_private: bool,
    pub is_friends_only: bool,
    pub night_lord: String,
    pub region: String,
    pub platform: String,
    pub joined_players: Vec<PlayerInfoResponseDto>,
    pub results: Vec<SessionResultResponseDto>,
    #[schema(value_type = String, format = DateTime)]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[schema(value_type = String, format = DateTime)]
    pub updated_at: chrono::DateTime<chrono::Utc>,
    #[schema(value_type = Option<String>)]
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
    #[schema(value_type = Option<String>)]
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub player_count: Option<u32>,
    pub new_session_created: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_session_created_id: Option<ObjectId>,
}

impl From<GameSession> for SessionResponseDto {
    fn from(session: GameSession) -> Self {
        // Capture the player count before we move the joined_players
        let player_count = session.joined_players.len() as u32;

        // Find the host name before we move joined_players
        let host_name = session
            .joined_players
            .iter()
            .find(|p| p.user_id == session.host_id)
            .map_or_else(|| "Unknown".to_string(), |p| p.username.clone());

        Self {
            id: session.id.to_hex(),
            name: session.name,
            host_id: session.host_id.clone(),
            host_name,
            password: session.password,
            status: session.status.to_string(),
            is_private: session.is_private,
            is_friends_only: session.is_friends_only,
            night_lord: session.night_lord,
            region: session.region,
            platform: session.platform,
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
            created_at: chrono::DateTime::from_timestamp(
                session.created_at.timestamp_millis() / 1000,
                0,
            )
            .unwrap_or_else(chrono::Utc::now),
            updated_at: chrono::DateTime::from_timestamp(
                session.updated_at.timestamp_millis() / 1000,
                0,
            )
            .unwrap_or_else(chrono::Utc::now),
            started_at: session.started_at.map(|dt| {
                chrono::DateTime::from_timestamp(dt.timestamp_millis() / 1000, 0)
                    .unwrap_or_else(chrono::Utc::now)
            }),
            completed_at: session.completed_at.map(|dt| {
                chrono::DateTime::from_timestamp(dt.timestamp_millis() / 1000, 0)
                    .unwrap_or_else(chrono::Utc::now)
            }),
            host_experience: session.host_experience,
            player_count: Some(player_count),
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
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub night_lord: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host_experience: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub player_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_friends_only: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimalPlayerInfoDto {
    pub username: String,
    pub experience: String,
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

/// DTO representation of GameSession for API documentation
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GameSessionDto {
    pub id: String,
    pub name: String,
    pub host_id: String,
    pub region: String,
    pub platform: String,
    pub password: String,
    pub is_private: bool,
    pub is_friends_only: bool,
    pub night_lord: String,
    pub status: SessionStatus,
    pub joined_players: Vec<PlayerInfoResponseDto>,
    pub results: Vec<SessionResultResponseDto>,
    pub ratings: Vec<RateSessionDto>,
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub started_at: Option<DateTime>,
    pub completed_at: Option<DateTime>,
    pub stats_updated: bool,
    pub new_session_created: bool,
    #[schema(value_type = String)]
    pub new_session_created_id: Option<ObjectId>,
}

impl From<GameSession> for GameSessionDto {
    fn from(session: GameSession) -> Self {
        Self {
            id: session.id.to_hex(),
            name: session.name,
            host_id: session.host_id,
            region: session.region,
            platform: session.platform,
            password: session.password,
            is_private: session.is_private,
            is_friends_only: session.is_friends_only,
            night_lord: session.night_lord,
            status: session.status,
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
            ratings: session.ratings,
            created_at: session.created_at,
            updated_at: session.updated_at,
            started_at: session.started_at,
            completed_at: session.completed_at,
            stats_updated: session.stats_updated,
            new_session_created: session.new_session_created,
            new_session_created_id: session.new_session_created_id,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserSessionResponseDto {
    pub previous_session: Option<GameSessionDto>,
    pub current_session: Option<GameSessionDto>,
}

/// Helper struct for converting between GameSession and GameSessionDto
pub struct UserSessionHelper;

impl UserSessionHelper {
    pub fn convert_session_data(data: Option<GameSession>) -> Option<GameSessionDto> {
        data.map(GameSessionDto::from)
    }

    pub fn from_game_sessions(
        previous: Option<GameSession>,
        current: Option<GameSession>,
    ) -> UserSessionResponseDto {
        UserSessionResponseDto {
            previous_session: Self::convert_session_data(previous),
            current_session: Self::convert_session_data(current),
        }
    }
}

/// Player information for the friendship matrix
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FriendshipPlayer {
    pub id: String,
    pub username: String,
    pub is_friends_with: Vec<String>,
    pub friend_request_sent: Vec<String>,
}

/// Response model for the friendship matrix
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FriendshipMatrix {
    pub players: Vec<FriendshipPlayer>,
}

// Define pagination metadata structure
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaginationMetadata {
    pub total_count: u64,
    pub page_count: u64,
    pub current_page: u64,
    pub per_page: u64,
}

//todo: openapi.rs is does not know how to handle this
// Define paginated response structure
#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedSessionsResponse<T>
where
    T: Serialize,
{
    pub items: Vec<T>,
    pub metadata: PaginationMetadata,
}
