use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Clone, ToSchema)]
pub struct BugReport {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub title: String,
    pub device: String,
    pub description: String,
    pub user_id: String,
    pub user_name: String,
    pub created_at: DateTime,
}

#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct CreateBugReportDto {
    #[validate(length(min = 5, max = 100))]
    pub title: String,
    #[validate(length(min = 2, max = 100))]
    pub device: String,
    #[validate(length(min = 10, max = 2000))]
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct BugReportResponseDto {
    pub id: String,
    pub title: String,
    pub device: String,
    pub description: String,
    pub user_id: String,
    pub user_name: String,
    pub created_at: String,
}

/// Response format for returning a list of bug reports
#[derive(Serialize, ToSchema)]
pub struct BugReportsListResponse {
    /// Status of the response
    pub status: String,
    /// Response data
    pub data: BugReportsData,
}

/// Data structure for bug reports list response
#[derive(Serialize, ToSchema)]
pub struct BugReportsData {
    /// List of bug report objects
    pub bugs: Vec<BugReportResponseDto>,
}

/// Response format for a single bug report
#[derive(Serialize, ToSchema)]
pub struct BugReportResponse {
    /// Status of the response
    pub status: String,
    /// Response data
    pub data: BugReportData,
}

/// Data structure for a single bug report response
#[derive(Serialize, ToSchema)]
pub struct BugReportData {
    /// The bug report object
    pub bug: BugReportResponseDto,
}

/// Response format for creating a bug report
#[derive(Serialize, ToSchema)]
pub struct CreateBugReportResponse {
    /// Status of the response
    pub status: String,
    /// Response data
    pub data: CreateBugReportData,
}

/// Data structure for create bug report response
#[derive(Serialize, ToSchema)]
pub struct CreateBugReportData {
    /// The ID of the created bug report
    pub id: String,
}

impl From<BugReport> for BugReportResponseDto {
    fn from(bug: BugReport) -> Self {
        Self {
            id: bug.id.unwrap().to_hex(),
            title: bug.title,
            device: bug.device,
            description: bug.description,
            user_id: bug.user_id,
            user_name: bug.user_name,
            created_at: bug.created_at.to_string(),
        }
    }
}
