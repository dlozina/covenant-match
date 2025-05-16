use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PaginationSearchQuery {
    pub page: Option<u64>,
    pub limit: Option<u64>,
    pub search: Option<String>,
}

// Add this struct for pagination query parameters
#[derive(Debug, Deserialize, ToSchema)]
pub struct PaginationQuery {
    pub page: Option<u64>,
    pub limit: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LimitQuery {
    pub limit: Option<u64>,
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
