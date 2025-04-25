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
