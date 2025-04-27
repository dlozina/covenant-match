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
    pub sessions: Vec<crate::models::session::GameSession>,
    pub pagination: AdminSessionsPaginationResponse,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AdminSessionResponse {
    pub status: String,
    pub data: crate::models::session::GameSession,
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
