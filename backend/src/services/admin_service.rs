use crate::models::admin::{
    AdminChatResponse, AdminDashboardStats, AdminSessionResponse, AdminSessionsData,
    AdminSessionsPaginationResponse, AdminSessionsQuery, AdminSessionsResponse,
    ChatMessageResponseDto, CreateFeatureFlagDto, DashboardStatsData, DashboardStatsResponse,
    FeatureFlag, FeatureFlagApiResponse, FeatureFlagData, FeatureFlagResponse, FeatureFlagsData,
    FeatureFlagsResponse, GameSessionDTO, MemoryUsage, PatchFeatureFlagDto, SystemInfo,
    SystemStatusData, SystemStatusResponse, UserInfoDto, WebSocketStatsData,
    WebSocketStatsResponse,
};
use crate::models::error::AppError;
use crate::models::session::{GameSession, SessionStatus};
use crate::repository::{
    feature_flag_repository, news_repository, session_repository, user_repository,
};
use chrono::{Duration, Utc};
use lazy_static::lazy_static;
use log::{debug, error, info};
use mongodb::{bson, Database};
use std::collections::HashMap;
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration as StdDuration, Instant};
use sysinfo::{System, SystemExt};

const VERSION: &str = env!("CARGO_PKG_VERSION");

// Feature Flag Cache
lazy_static! {
    static ref FEATURE_FLAG_CACHE: Mutex<FeatureFlagCache> = Mutex::new(FeatureFlagCache::new());
}

struct FeatureFlagCache {
    flags: HashMap<String, FeatureFlag>,
    last_refresh: Instant,
    is_initialized: bool,
}

impl FeatureFlagCache {
    fn new() -> Self {
        FeatureFlagCache {
            flags: HashMap::new(),
            last_refresh: Instant::now()
                .checked_sub(StdDuration::from_secs(3600))
                .unwrap_or_else(Instant::now),
            is_initialized: false,
        }
    }

    fn get(&self, key: &str) -> Option<&FeatureFlag> {
        self.flags.get(key)
    }

    fn set(&mut self, flag: FeatureFlag) {
        self.flags.insert(flag.key.clone(), flag);
    }

    fn set_all(&mut self, flags: Vec<FeatureFlag>) {
        self.flags.clear();
        for flag in flags {
            self.flags.insert(flag.key.clone(), flag);
        }
        self.last_refresh = Instant::now();
        self.is_initialized = true;
    }

    fn remove(&mut self, key: &str) {
        self.flags.remove(key);
    }

    fn needs_refresh(&self) -> bool {
        !self.is_initialized || self.last_refresh.elapsed() > StdDuration::from_secs(60)
    }
}

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
        None,                     // Don't filter by friends_only for admin view
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

    // Convert GameSession to GameSessionDTO
    let session_dtos: Vec<GameSessionDTO> = sessions.into_iter().map(|s| s.into()).collect();

    let response = AdminSessionsResponse {
        status: "success".to_string(),
        data: AdminSessionsData {
            sessions: session_dtos,
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

    // Convert GameSession to GameSessionDTO
    let session_dto: GameSessionDTO = session.into();

    let response = AdminSessionResponse {
        status: "success".to_string(),
        data: session_dto,
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

// Feature Flag Functions

/// Get all feature flags
pub async fn get_feature_flags(db: &Database) -> Result<FeatureFlagsResponse, AppError> {
    debug!("get_feature_flags: Starting to get feature flags");

    // Use a timeout when acquiring the lock to avoid deadlocks
    let cache_result = FEATURE_FLAG_CACHE.try_lock();

    let flags = match cache_result {
        Ok(mut cache) => {
            debug!("get_feature_flags: Successfully acquired cache lock");

            // Check if cache needs refresh
            if cache.needs_refresh() {
                debug!("get_feature_flags: Cache needs refresh, fetching from database");
                match feature_flag_repository::find_all(db).await {
                    Ok(db_flags) => {
                        debug!(
                            "get_feature_flags: Setting {} flags in cache",
                            db_flags.len()
                        );
                        cache.set_all(db_flags.clone());
                        db_flags
                    }
                    Err(e) => {
                        error!(
                            "get_feature_flags: Error fetching flags from database: {:?}",
                            e
                        );
                        // Return an empty list on error instead of failing completely
                        Vec::new()
                    }
                }
            } else {
                debug!(
                    "get_feature_flags: Using cached flags, count: {}",
                    cache.flags.len()
                );
                cache.flags.values().cloned().collect()
            }
        }
        Err(e) => {
            // If we can't acquire the lock, go directly to the database
            error!("get_feature_flags: Failed to acquire cache lock: {:?}", e);
            debug!("get_feature_flags: Bypassing cache, fetching directly from database");

            match feature_flag_repository::find_all(db).await {
                Ok(db_flags) => {
                    debug!(
                        "get_feature_flags: Got {} flags directly from database",
                        db_flags.len()
                    );
                    db_flags
                }
                Err(e) => {
                    error!("get_feature_flags: Error fetching flags directly: {:?}", e);
                    // Return an empty list on error instead of failing
                    Vec::new()
                }
            }
        }
    };

    debug!(
        "get_feature_flags: Building response with {} flags",
        flags.len()
    );

    // Convert FeatureFlag to FeatureFlagApiResponse
    let api_flags = flags
        .into_iter()
        .map(FeatureFlagApiResponse::from)
        .collect();

    let response = FeatureFlagsResponse {
        status: "success".to_string(),
        data: FeatureFlagsData {
            feature_flags: api_flags,
        },
    };

    debug!("get_feature_flags: Successfully built response, returning");
    Ok(response)
}

/// Get a feature flag by key
pub async fn get_feature_flag(db: &Database, key: &str) -> Result<FeatureFlagResponse, AppError> {
    // Try to get from cache first
    {
        let cache = FEATURE_FLAG_CACHE.lock().map_err(|_| {
            AppError::InternalError("Failed to acquire lock on feature flag cache".to_string())
        })?;

        if let Some(flag) = cache.get(key) {
            return Ok(FeatureFlagResponse {
                status: "success".to_string(),
                data: FeatureFlagData {
                    feature_flag: FeatureFlagApiResponse::from(flag.clone()),
                },
            });
        }
    }

    // If not in cache, fetch from database
    let flag = feature_flag_repository::find_by_key(db, key)
        .await?
        .ok_or_else(|| {
            AppError::InternalError(format!("Feature flag with key '{}' not found", key))
        })?;

    // Update cache
    {
        let mut cache = FEATURE_FLAG_CACHE.lock().map_err(|_| {
            AppError::InternalError("Failed to acquire lock on feature flag cache".to_string())
        })?;
        cache.set(flag.clone());
    }

    let response = FeatureFlagResponse {
        status: "success".to_string(),
        data: FeatureFlagData {
            feature_flag: FeatureFlagApiResponse::from(flag),
        },
    };

    Ok(response)
}

/// Create a new feature flag
pub async fn create_feature_flag(
    db: &Database,
    dto: CreateFeatureFlagDto,
) -> Result<FeatureFlagResponse, AppError> {
    let mut flag = FeatureFlag {
        id: None,
        key: dto.key,
        name: dto.name,
        description: dto.description,
        enabled: dto.enabled,
        default_value: dto.default_value,
        created_at: None,
        updated_at: None,
    };

    let created_flag = feature_flag_repository::create(db, &mut flag).await?;

    // Update cache
    {
        let mut cache = FEATURE_FLAG_CACHE.lock().map_err(|_| {
            AppError::InternalError("Failed to acquire lock on feature flag cache".to_string())
        })?;
        cache.set(created_flag.clone());
    }

    let response = FeatureFlagResponse {
        status: "success".to_string(),
        data: FeatureFlagData {
            feature_flag: FeatureFlagApiResponse::from(created_flag),
        },
    };

    Ok(response)
}

/// Update a feature flag
pub async fn update_feature_flag(
    db: &Database,
    key: &str,
    flag_patch: PatchFeatureFlagDto,
) -> Result<FeatureFlagResponse, AppError> {
    // First get the existing flag
    let existing = feature_flag_repository::find_by_key(db, key)
        .await?
        .ok_or_else(|| {
            AppError::InternalError(format!("Feature flag with key '{}' not found", key))
        })?;

    // Apply the patch to create an updated flag
    let updated_flag = feature_flag_repository::update_partial(db, key, &flag_patch).await?;

    // Update cache
    {
        let mut cache = FEATURE_FLAG_CACHE.lock().map_err(|_| {
            AppError::InternalError("Failed to acquire lock on feature flag cache".to_string())
        })?;
        cache.set(updated_flag.clone());
    }

    let response = FeatureFlagResponse {
        status: "success".to_string(),
        data: FeatureFlagData {
            feature_flag: FeatureFlagApiResponse::from(updated_flag),
        },
    };

    Ok(response)
}

/// Delete a feature flag
pub async fn delete_feature_flag(db: &Database, key: &str) -> Result<bool, AppError> {
    let result = feature_flag_repository::delete(db, key).await?;

    // Update cache
    if result {
        let mut cache = FEATURE_FLAG_CACHE.lock().map_err(|_| {
            AppError::InternalError("Failed to acquire lock on feature flag cache".to_string())
        })?;
        cache.remove(key);
    }

    Ok(result)
}

/// Get a feature flag value by key (client-facing API)
pub async fn get_feature_flag_value(db: &Database, key: &str) -> Result<bool, AppError> {
    // Try to get from cache first
    {
        let cache = FEATURE_FLAG_CACHE.lock().map_err(|_| {
            AppError::InternalError("Failed to acquire lock on feature flag cache".to_string())
        })?;

        if let Some(flag) = cache.get(key) {
            return Ok(flag.enabled);
        }
    }

    // If not in cache, fetch from database
    let flag_result = feature_flag_repository::find_by_key(db, key).await?;

    match flag_result {
        Some(flag) => {
            // Update cache
            {
                let mut cache = FEATURE_FLAG_CACHE.lock().map_err(|_| {
                    AppError::InternalError(
                        "Failed to acquire lock on feature flag cache".to_string(),
                    )
                })?;
                cache.set(flag.clone());
            }
            Ok(flag.enabled)
        }
        None => {
            debug!(
                "Feature flag '{}' not found, returning default (false)",
                key
            );
            Ok(false)
        }
    }
}
