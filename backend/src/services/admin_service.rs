use crate::models::admin::{AdminDashboardStats, MemoryUsage, SystemInfo};
use crate::models::error::AppError;
use crate::repository::session_repository;
use crate::repository::{news_repository, user_repository};
use mongodb::Database;
use std::process;
use std::time::{Duration, SystemTime};

pub async fn get_dashboard_stats(db: &Database) -> Result<AdminDashboardStats, AppError> {
    // Get user counts
    let users_count = user_repository::count_users_by_role(db, None).await?;

    // We don't have an "active_users" concept yet, so we'll just use logged-in users in the last 30 days
    // For now, using the same value as total users
    let active_users_count = users_count;

    // Get session counts using repository function
    let total_sessions = session_repository::count_sessions_by_status(db, None, None).await?;

    // Count active sessions (Open + InProgress)
    let open_sessions =
        session_repository::count_sessions_by_status(db, Some("Open".to_string()), None).await?;
    let in_progress_sessions =
        session_repository::count_sessions_by_status(db, Some("InProgress".to_string()), None)
            .await?;
    let active_sessions = open_sessions + in_progress_sessions;

    // Count completed sessions
    let completed_sessions =
        session_repository::count_sessions_by_status(db, Some("Completed".to_string()), None)
            .await?;

    // Get news counts
    let news_count = news_repository::count_news(db, true).await?;

    // Count published news
    let published_news_count = news_repository::count_news(db, false).await?;

    Ok(AdminDashboardStats {
        users_count,
        active_users_count,
        total_sessions,
        active_sessions,
        completed_sessions,
        news_count,
        published_news_count,
    })
}

pub async fn get_system_info() -> Result<SystemInfo, AppError> {
    // Get application version from environment
    let version = env!("CARGO_PKG_VERSION").to_string();

    // Get environment name
    let environment = std::env::var("ENVIRONMENT").unwrap_or_else(|_| "development".to_string());

    // Get uptime
    let process_start = get_process_start_time().map_err(|e| {
        AppError::SystemInfoError(format!("Failed to get process start time: {}", e))
    })?;

    let uptime = format_uptime(process_start);

    // Get memory usage
    let memory_usage = get_memory_usage()
        .map_err(|e| AppError::SystemInfoError(format!("Failed to get memory usage: {}", e)))?;

    // Database and API status are hard-coded to "OK" for now
    // In the future, we could add real health checks
    let db_status = "OK".to_string();
    let api_status = "OK".to_string();

    Ok(SystemInfo {
        version,
        environment,
        uptime,
        memory_usage,
        db_status,
        api_status,
    })
}

fn get_process_start_time() -> Result<SystemTime, String> {
    // This is a simplified implementation for system time
    // On real systems, we'd use platform-specific APIs to get the actual process start time
    // For now, we'll just return the current time minus 1 hour (simulating that the server has been up for 1 hour)
    let now = SystemTime::now();
    Ok(now.checked_sub(Duration::from_secs(3600)).unwrap_or(now))
}

fn format_uptime(start_time: SystemTime) -> String {
    let now = SystemTime::now();
    let uptime_seconds = now
        .duration_since(start_time)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let days = uptime_seconds / 86400;
    let hours = (uptime_seconds % 86400) / 3600;
    let minutes = (uptime_seconds % 3600) / 60;
    let seconds = uptime_seconds % 60;

    format!("{}d {}h {}m {}s", days, hours, minutes, seconds)
}

fn get_memory_usage() -> Result<MemoryUsage, String> {
    // This is a simplified implementation for memory usage
    // On real systems, we'd use platform-specific APIs to get the actual memory usage
    // For now, we'll just return some dummy values

    // Dummy values
    let total_mb = 1024;
    let used_mb = 512;
    let free_mb = total_mb - used_mb;
    let used_percent = (used_mb as f64 / total_mb as f64) * 100.0;

    Ok(MemoryUsage {
        total_mb,
        used_mb,
        free_mb,
        used_percent,
    })
}
