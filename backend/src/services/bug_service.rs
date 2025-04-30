use crate::models::bug::{BugReport, BugReportResponseDto, CreateBugReportDto};
use crate::models::error::AppError;
use crate::repository::bug_repository;
use crate::services::user_service;
use log::{error, info};
use mongodb::bson::DateTime;

/// Create a new bug report
pub async fn create_bug_report(
    db: &mongodb::Database,
    dto: CreateBugReportDto,
    user_id: String,
) -> Result<String, AppError> {
    // Get the user information from the database
    let user = user_service::get_user_by_id(db, &user_id).await?;
    let user_name = user.username;

    // Validate input (already handled by the validation in the model)
    // Create bug report
    let bug = BugReport {
        id: None,
        title: dto.title,
        device: dto.device,
        description: dto.description,
        user_id,
        user_name,
        created_at: DateTime::now(),
    };

    info!("Creating bug report: {:?}", bug);

    // Save to database
    let bug_id = bug_repository::create_bug_report(db, &bug).await?;

    Ok(bug_id)
}

/// Get all bug reports
pub async fn get_all_bug_reports(
    db: &mongodb::Database,
) -> Result<Vec<BugReportResponseDto>, AppError> {
    let bugs = bug_repository::get_all_bug_reports(db).await?;
    let response = bugs.into_iter().map(BugReportResponseDto::from).collect();
    Ok(response)
}

/// Get bug report by ID
pub async fn get_bug_report_by_id(
    db: &mongodb::Database,
    id: &str,
) -> Result<BugReportResponseDto, AppError> {
    let bug = bug_repository::get_bug_report_by_id(db, id)
        .await?
        .ok_or_else(|| {
            error!("Bug report not found with ID: {}", id);
            AppError::NotFound("Bug report not found".to_string())
        })?;

    Ok(BugReportResponseDto::from(bug))
}

/// Get bug reports by user ID
pub async fn get_bug_reports_by_user_id(
    db: &mongodb::Database,
    user_id: &str,
) -> Result<Vec<BugReportResponseDto>, AppError> {
    let bugs = bug_repository::get_bug_reports_by_user_id(db, user_id).await?;
    let response = bugs.into_iter().map(BugReportResponseDto::from).collect();
    Ok(response)
}
