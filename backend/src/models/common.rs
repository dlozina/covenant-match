use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PaginationQuery {
    pub page: Option<u64>,
    pub limit: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LimitQuery {
    pub limit: Option<u64>,
}
