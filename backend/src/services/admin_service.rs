use crate::models::admin::{
    AdminDashboardStats, AdminSessionResponse, AdminSessionsData, AdminSessionsPaginationResponse,
    AdminSessionsResponse, DashboardStatsData, DashboardStatsResponse, MemoryUsage, SystemInfo,
    SystemStatusData, SystemStatusResponse,
};
use crate::models::error::AppError;
use crate::models::session::{GameSession, SessionStatus};
use crate::repository::{news_repository, session_repository, user_repository};
use chrono::{Duration, Utc};
use mongodb::{bson, Database};
use std::process::Command;
use sysinfo::{System, SystemExt};

const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Get dashboard statistics for admin panel
pub async fn get_dashboard_stats(db: &Database) -> Result<DashboardStatsResponse, AppError> {
    // Get users statistics
    let users = user_repository::find_users_by_role_paginated(db, None, 1, 1000).await?;
    let users_count = users.len() as u64;

    // Get active users count
    // Since there's no last_login field, we'll use a simple heuristic:
    // Consider all users as active users for now
    let active_users_count = users_count;

    // Get session statistics
    let total_sessions = session_repository::count_sessions_by_status(db, None, None).await?;

    // Get active sessions count (open or in progress)
    let active_sessions =
        session_repository::count_sessions_by_status(db, Some("InProgress".to_string()), None)
            .await?
            + session_repository::count_sessions_by_status(db, Some("Open".to_string()), None)
                .await?;

    // Get completed sessions count
    let completed_sessions =
        session_repository::count_sessions_by_status(db, Some("Completed".to_string()), None)
            .await?;

    // Get news count
    let news_items = news_repository::find_all_news(db).await?;
    let news_count = news_items.len() as u64;

    // Get published news count
    let published_news_count = news_items.iter().filter(|news| news.published).count() as u64;

    let stats = AdminDashboardStats {
        users_count,
        active_users_count,
        total_sessions,
        active_sessions,
        completed_sessions,
        news_count,
        published_news_count,
    };

    let response = DashboardStatsResponse {
        status: "success".to_string(),
        data: DashboardStatsData { stats },
    };

    Ok(response)
}

/// Get system information for admin panel
pub async fn get_system_info() -> Result<SystemStatusResponse, AppError> {
    // Get uptime
    let uptime = match Command::new("uptime").output() {
        Ok(output) => String::from_utf8(output.stdout)
            .unwrap_or_else(|_| "Unknown".to_string())
            .trim()
            .to_string(),
        Err(_) => "Unknown".to_string(),
    };

    // Get system memory info
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_memory = sys.total_memory() / 1024 / 1024; // Convert to MB
    let used_memory = sys.used_memory() / 1024 / 1024; // Convert to MB
    let free_memory = total_memory - used_memory;
    let used_percent = if total_memory > 0 {
        (used_memory as f64 / total_memory as f64) * 100.0
    } else {
        0.0
    };

    let memory_usage = MemoryUsage {
        total_mb: total_memory,
        used_mb: used_memory,
        free_mb: free_memory,
        used_percent,
    };

    // Get environment
    let env = if cfg!(debug_assertions) {
        "development"
    } else {
        "production"
    };

    // Build system info
    let system_info = SystemInfo {
        version: VERSION.to_string(),
        environment: env.to_string(),
        uptime: uptime,
        memory_usage,
        db_status: "OK".to_string(), // Simplified - in reality, you'd want to check DB connection
        api_status: "OK".to_string(),
    };

    let response = SystemStatusResponse {
        status: "success".to_string(),
        data: SystemStatusData { system_info },
    };

    Ok(response)
}

/// Get sessions with pagination for admin panel
pub async fn get_sessions_paginated(
    db: &Database,
    page: u64,
    limit: u64,
    status: Option<String>,
) -> Result<AdminSessionsResponse, AppError> {
    // Convert status string to SessionStatus enum if provided
    let status_filter = match &status {
        Some(ref s) => match s.to_lowercase().as_str() {
            "open" => Some(SessionStatus::Open),
            "full" => Some(SessionStatus::Full),
            "in_progress" | "inprogress" => Some(SessionStatus::InProgress),
            "completed" => Some(SessionStatus::Completed),
            "cancelled" => Some(SessionStatus::Cancelled),
            _ => None,
        },
        None => None,
    };

    // Get all sessions matching the filter
    let sessions = session_repository::find_sessions(
        db,
        status_filter,
        Some(limit),
        Some((page - 1) * limit), // Convert to zero-based offset
        None,                     // Don't filter private/public
        None,                     // Don't filter by region
        None,                     // Don't filter by platform
    )
    .await?;

    // Get total count for pagination
    let total = session_repository::count_sessions_by_status(
        db,
        status.clone().map(|s| s.to_string()),
        None,
    )
    .await?;

    // Calculate total pages
    let total_pages = (total + limit - 1) / limit; // Ceiling division

    let pagination = AdminSessionsPaginationResponse {
        total,
        page,
        limit,
        total_pages,
    };

    let response = AdminSessionsResponse {
        status: "success".to_string(),
        data: AdminSessionsData {
            sessions,
            pagination,
        },
    };

    Ok(response)
}

/// Get a specific session by ID for admin
pub async fn get_session_by_id(
    db: &Database,
    session_id: &str,
) -> Result<AdminSessionResponse, AppError> {
    let session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    let response = AdminSessionResponse {
        status: "success".to_string(),
        data: session,
    };

    Ok(response)
}

/// Delete a session by ID for admin
pub async fn delete_session(db: &Database, session_id: &str) -> Result<(), AppError> {
    // Verify the session exists first
    let _session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Delete the session from the database
    let collection = db.collection::<GameSession>("sessions");

    let object_id =
        mongodb::bson::oid::ObjectId::parse_str(session_id).map_err(|_| AppError::InvalidId)?;

    let result = collection
        .delete_one(bson::doc! { "_id": object_id })
        .await
        .map_err(|e| {
            log::error!("Failed to delete session: {:?}", e);
            AppError::InternalError("Failed to delete session".to_string())
        })?;

    if result.deleted_count == 0 {
        return Err(AppError::SessionNotFound);
    }

    Ok(())
}
