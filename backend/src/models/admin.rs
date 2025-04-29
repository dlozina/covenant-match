use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminDashboardStats {
    pub users_count: u64,
    pub active_users_count: u64,
    pub total_sessions: u64,
    pub active_sessions: u64,
    pub completed_sessions: u64,
    pub news_count: u64,
    pub published_news_count: u64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub version: String,
    pub environment: String,
    pub uptime: String,
    pub memory_usage: MemoryUsage,
    pub db_status: String,
    pub api_status: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct MemoryUsage {
    pub total_mb: u64,
    pub used_mb: u64,
    pub free_mb: u64,
    pub used_percent: f64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SystemStatusResponse {
    pub status: String,
    pub data: SystemStatusData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct SystemStatusData {
    pub system_info: SystemInfo,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DashboardStatsResponse {
    pub status: String,
    pub data: DashboardStatsData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct DashboardStatsData {
    pub stats: AdminDashboardStats,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminSessionsPaginationResponse {
    pub total: u64,
    pub page: u64,
    pub limit: u64,
    pub total_pages: u64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminSessionsResponse {
    pub status: String,
    pub data: AdminSessionsData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AdminSessionsData {
    pub sessions: Vec<GameSessionDTO>,
    pub pagination: AdminSessionsPaginationResponse,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AdminSessionResponse {
    pub status: String,
    pub data: GameSessionDTO,
}

/// Parameters for sessions query
#[derive(serde::Deserialize)]
pub struct AdminSessionsQuery {
    pub page: Option<u64>,
    pub limit: Option<u64>,
    pub status: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct AdminChatResponse {
    pub messages: Vec<ChatMessageResponseDto>,
    pub total: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatHistoryParams {
    pub session_id: Option<String>,
    pub limit: Option<i64>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    sender_id: String,
    sender_name: String,
    message: String,
    timestamp: i64,
    session_id: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageResponseDto {
    pub sender_id: String,
    pub sender_name: String,
    pub message: String,
    pub timestamp: i64,
    pub session_id: String,
    // Additional user information
    pub user: Option<UserInfoDto>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct UserInfoDto {
    pub username: Option<String>,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteMessagesParams {
    pub session_id: Option<String>,
    pub message_id: Option<String>,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

// Feature Flag models

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct FeatureFlag {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<mongodb::bson::oid::ObjectId>,
    pub key: String,
    pub name: String,
    pub description: String,
    pub enabled: bool,
    pub default_value: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<mongodb::bson::DateTime>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<mongodb::bson::DateTime>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FeatureFlagsResponse {
    pub status: String,
    pub data: FeatureFlagsData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FeatureFlagsData {
    pub feature_flags: Vec<FeatureFlagApiResponse>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FeatureFlagResponse {
    pub status: String,
    pub data: FeatureFlagData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FeatureFlagData {
    pub feature_flag: FeatureFlagApiResponse,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateFeatureFlagDto {
    pub key: String,
    pub name: String,
    pub description: String,
    pub enabled: bool,
    pub default_value: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PatchFeatureFlagDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enabled: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<bool>,
}

// API Response version with formatted dates
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FeatureFlagApiResponse {
    pub id: String,
    pub key: String,
    pub name: String,
    pub description: String,
    pub enabled: bool,
    pub default_value: bool,
    pub created_at: String,
    pub updated_at: String,
}

// Implement conversion from FeatureFlag to FeatureFlagApiResponse
impl From<FeatureFlag> for FeatureFlagApiResponse {
    fn from(flag: FeatureFlag) -> Self {
        let id = flag.id.map_or_else(String::new, |oid| oid.to_hex());

        // Format dates as ISO strings or use current time if missing
        let now = chrono::Utc::now().to_rfc3339();

        // Convert MongoDB DateTime to ISO string
        let created_at = flag.created_at.map_or_else(
            || now.clone(),
            |dt| {
                let chrono_date = chrono::DateTime::from_timestamp_millis(dt.timestamp_millis())
                    .unwrap_or_else(|| chrono::Utc::now());
                chrono_date.to_rfc3339()
            },
        );

        let updated_at = flag.updated_at.map_or_else(
            || now,
            |dt| {
                let chrono_date = chrono::DateTime::from_timestamp_millis(dt.timestamp_millis())
                    .unwrap_or_else(|| chrono::Utc::now());
                chrono_date.to_rfc3339()
            },
        );

        Self {
            id,
            key: flag.key,
            name: flag.name,
            description: flag.description,
            enabled: flag.enabled,
            default_value: flag.default_value,
            created_at,
            updated_at,
        }
    }
}

// WebSocket Stats Response Models
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct WebSocketStatsResponse {
    pub status: String,
    pub data: WebSocketStatsData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct WebSocketStatsData {
    pub stats: ConnectionStatsResponse,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatsResponse {
    pub current_connections: u32,
    pub total_connections_today: u32,
    pub total_messages: u32,
    pub connections_per_hour: Vec<ConnectionsPerHourResponse>,
    pub session_connections: Vec<SessionConnectionResponse>,
    pub mailbox_sizes: Vec<ActorMailboxResponse>,
    pub message_rates: Vec<ActorMailboxResponse>,
    pub actor_count: u32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionsPerHourResponse {
    pub hour: String,
    pub count: u32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SessionConnectionResponse {
    pub session_id: String,
    pub count: u32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ActorMailboxResponse {
    pub actor: String,
    pub rate: u32,
}

// Implement conversion from ConnectionStats to ConnectionStatsResponse
impl From<crate::ws::messages::ConnectionStats> for ConnectionStatsResponse {
    fn from(stats: crate::ws::messages::ConnectionStats) -> Self {
        Self {
            current_connections: stats.current_connections,
            total_connections_today: stats.total_connections_today,
            total_messages: stats.total_messages,
            connections_per_hour: stats
                .connections_per_hour
                .into_iter()
                .map(|info| ConnectionsPerHourResponse {
                    hour: info.hour,
                    count: info.count,
                })
                .collect(),
            session_connections: stats
                .session_connections
                .into_iter()
                .map(|info| SessionConnectionResponse {
                    session_id: info.session_id,
                    count: info.count,
                })
                .collect(),
            mailbox_sizes: stats
                .mailbox_sizes
                .into_iter()
                .map(|info| ActorMailboxResponse {
                    actor: info.actor,
                    rate: info.rate,
                })
                .collect(),
            message_rates: stats
                .message_rates
                .into_iter()
                .map(|info| ActorMailboxResponse {
                    actor: info.actor,
                    rate: info.rate,
                })
                .collect(),
            actor_count: stats.actor_count,
        }
    }
}

// Game Session DTO for admin API responses with camel case fields
#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GameSessionDTO {
    pub id: String,
    pub name: String,
    pub host_id: String,
    pub region: String,
    pub platform: String,
    pub password: String,
    pub is_private: bool,
    pub night_lord: String,
    pub status: String,
    pub joined_players: Vec<PlayerDTO>,
    pub results: Vec<ResultDTO>,
    pub ratings: Vec<RatingDTO>,
    pub created_at: String,
    pub updated_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub stats_updated: bool,
    pub new_session_created: bool,
    pub new_session_created_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PlayerDTO {
    pub user_id: String,
    pub username: String,
    pub nightfarer: String,
    pub covenant_name: String,
    pub region: String,
    pub platform: String,
    pub joined_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ResultDTO {
    pub user_id: String,
    pub result: String,
    pub rating: i32,
    pub feedback: String,
    pub submitted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RatingDTO {
    pub user_id: String,
    pub rating: i32,
    pub comment: String,
    pub created_at: String,
}

// Implement From trait to convert from GameSession to GameSessionDTO
impl From<crate::models::session::GameSession> for GameSessionDTO {
    fn from(session: crate::models::session::GameSession) -> Self {
        // Convert MongoDB ObjectId to hex string
        let id = session.id.to_hex();
        let new_session_created_id = session.new_session_created_id.map(|oid| oid.to_hex());

        // Format dates as ISO strings
        let format_date = |dt: Option<mongodb::bson::DateTime>| -> String {
            dt.map_or_else(String::new, |d| {
                chrono::DateTime::from_timestamp_millis(d.timestamp_millis())
                    .map_or_else(String::new, |cd| cd.to_rfc3339())
            })
        };

        // Convert started_at and completed_at to Option<String>
        let started_at = session.started_at.map(|dt| {
            chrono::DateTime::from_timestamp_millis(dt.timestamp_millis())
                .map_or_else(String::new, |cd| cd.to_rfc3339())
        });

        let completed_at = session.completed_at.map(|dt| {
            chrono::DateTime::from_timestamp_millis(dt.timestamp_millis())
                .map_or_else(String::new, |cd| cd.to_rfc3339())
        });

        // Convert joined players
        let joined_players = session
            .joined_players
            .into_iter()
            .map(|player| PlayerDTO {
                user_id: player.user_id,
                username: player.username,
                nightfarer: player.nightfarer,
                covenant_name: player.covenant_name,
                region: player.region,
                platform: player.platform,
                joined_at: format_date(Some(player.joined_at)),
            })
            .collect();

        // Convert results
        let results = session
            .results
            .into_iter()
            .map(|result| ResultDTO {
                user_id: result.user_id,
                result: result.result.to_string(),
                rating: result.rating.unwrap_or(0) as i32,
                feedback: result.feedback.unwrap_or_else(String::new),
                submitted_at: format_date(Some(result.submitted_at)),
            })
            .collect();

        // Convert ratings
        let ratings = session
            .ratings
            .into_iter()
            .map(|rating| RatingDTO {
                user_id: rating.user_id.unwrap_or_else(String::new),
                rating: rating.rating as i32,
                comment: rating.comment.unwrap_or_else(String::new),
                created_at: format_date(Some(rating.created_at)),
            })
            .collect();

        Self {
            id,
            name: session.name,
            host_id: session.host_id,
            region: session.region,
            platform: session.platform,
            password: session.password,
            is_private: session.is_private,
            night_lord: session.night_lord,
            status: session.status.to_string(),
            joined_players,
            results,
            ratings,
            created_at: format_date(Some(session.created_at)),
            updated_at: format_date(Some(session.updated_at)),
            started_at,
            completed_at,
            stats_updated: session.stats_updated,
            new_session_created: session.new_session_created,
            new_session_created_id,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::session::{
        GameResult, GameSession, PlayerInfo, SessionResult, SessionStatus,
    };
    use chrono::Utc;
    use mongodb::bson::DateTime;

    #[test]
    fn test_game_session_to_dto_conversion() {
        // Create a sample GameSession
        let now = Utc::now();
        let bson_now = DateTime::from_millis(now.timestamp_millis());

        let session = GameSession {
            id: mongodb::bson::oid::ObjectId::new(),
            name: "Test Session".to_string(),
            host_id: "user123".to_string(),
            region: "Europe".to_string(),
            platform: "PlayStation".to_string(),
            password: "test".to_string(),
            is_private: false,
            is_friends_only: false,
            night_lord: "Test Lord".to_string(),
            status: SessionStatus::Completed,
            joined_players: vec![PlayerInfo {
                user_id: "user123".to_string(),
                username: "testuser".to_string(),
                nightfarer: "Wylder".to_string(),
                covenant_name: "Way of White".to_string(),
                region: "Europe".to_string(),
                platform: "PlayStation".to_string(),
                experience: "Beginner".to_string(),
                joined_at: bson_now,
            }],
            results: vec![SessionResult {
                user_id: "user123".to_string(),
                result: GameResult::Win,
                rating: Some(5),
                feedback: Some("Great game".to_string()),
                submitted_at: bson_now,
            }],
            ratings: vec![],
            created_at: bson_now,
            updated_at: bson_now,
            started_at: Some(bson_now),
            completed_at: Some(bson_now),
            stats_updated: true,
            new_session_created: false,
            new_session_created_id: None,
        };

        // Convert to DTO
        let dto: GameSessionDTO = session.into();

        // Verify conversion results
        assert_eq!(dto.name, "Test Session");
        assert_eq!(dto.host_id, "user123");
        assert_eq!(dto.platform, "PlayStation");
        assert_eq!(dto.is_private, false);
        assert_eq!(dto.night_lord, "Test Lord");
        assert_eq!(dto.status, "Completed");

        // Should have same number of players
        assert_eq!(dto.joined_players.len(), 1);
        assert_eq!(dto.joined_players[0].username, "testuser");

        // Should have same number of results
        assert_eq!(dto.results.len(), 1);
        assert_eq!(dto.results[0].user_id, "user123");
        assert_eq!(dto.results[0].result, "Win");
        assert_eq!(dto.results[0].rating, 5);
        assert_eq!(dto.results[0].feedback, "Great game");

        // Should have properly formatted dates
        assert!(!dto.created_at.is_empty());
        assert!(!dto.updated_at.is_empty());
        assert!(dto.started_at.is_some());
        assert!(dto.completed_at.is_some());
    }
}
