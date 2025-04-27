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
