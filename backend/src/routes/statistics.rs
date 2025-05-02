use crate::models::statistics::{
    NightLordStatsResponse, PaginatedSessionData, PaginatedSessionResponse, PaginationInfo,
    PaginationQuery, SessionHistoryResponse,
};
use crate::services::statistics_service;
use crate::utils::jwt;
use crate::{
    repository::session_repository, repository::user_repository, services::session_service,
};
use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use mongodb::Database;
use serde::{Deserialize, Serialize};
use serde_json::json;
use utoipa::ToSchema;

/// Get current user's statistics
#[utoipa::path(
    get,
    path = "/api/v1/statistics/users/me",
    responses(
        (status = 200, description = "User statistics retrieved successfully", body = UserStatistics),
        (status = 404, description = "Statistics not found for user"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/users/me")]
async fn get_current_user_statistics(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match statistics_service::get_user_statistics(&db, &user_id).await {
        Ok(Some(stats)) => HttpResponse::Ok().json(stats),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "status": "error",
            "message": "Statistics not found for user"
        })),
        Err(e) => {
            log::error!("Error fetching user statistics: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get current user's session history with pagination
#[utoipa::path(
    get,
    path = "/api/v1/statistics/users/me/sessions",
    params(
        ("page" = Option<u64>, Query, description = "Page number (1-indexed, default: 1)"),
        ("limit" = Option<u64>, Query, description = "Items per page (default: 10)")
    ),
    responses(
        (status = 200, description = "User session history retrieved successfully", body = PaginatedSessionResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/users/me/sessions")]
async fn get_current_user_session_history(
    db: web::Data<Database>,
    req: HttpRequest,
    query: web::Query<PaginationQuery>,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Get pagination parameters with defaults
    // Convert from 1-indexed (UI) to 0-indexed (internal)
    let page = query.page.unwrap_or(1).saturating_sub(1);
    let limit = query.limit.unwrap_or(10);

    match statistics_service::get_user_session_history_paginated(&db, &user_id, page, limit).await {
        Ok(paginated_history) => {
            // Transform to API response format
            let response = PaginatedSessionResponse {
                status: "success".to_string(),
                data: PaginatedSessionData {
                    pagination: PaginationInfo {
                        // Convert back to 1-indexed for response
                        page: paginated_history.pagination.page + 1,
                        limit: paginated_history.pagination.limit,
                        total: paginated_history.pagination.total,
                        total_pages: paginated_history.pagination.total_pages,
                    },
                    sessions: paginated_history
                        .sessions
                        .into_iter()
                        .map(|entry| SessionHistoryResponse {
                            session_id: entry.session_id,
                            session_name: entry.session_name,
                            night_lord: entry.night_lord,
                            player_nightfarer: entry.player_nightfarer,
                            player_result: entry.player_result,
                            created_at: entry.created_at,
                            completed_at: entry.completed_at,
                        })
                        .collect(),
                },
            };

            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            log::error!("Error fetching paginated user session history: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get statistics for a specific Night Lord
#[utoipa::path(
    get,
    path = "/api/v1/statistics/night-lords/{name}",
    params(
        ("name" = String, Path, description = "Name of the Night Lord")
    ),
    responses(
        (status = 200, description = "Night Lord statistics retrieved successfully", body = NightLordStatsResponse),
        (status = 404, description = "Statistics not found for Night Lord"),
        (status = 500, description = "Internal server error")
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/night-lords/{name}")]
async fn get_night_lord_statistics(
    db: web::Data<Database>,
    path: web::Path<String>,
) -> impl Responder {
    let night_lord_name = path.into_inner();

    // Query all user statistics to gather data about this Night Lord
    match statistics_service::get_all_user_statistics(&db).await {
        Ok(all_stats) => {
            // Aggregate stats for this Night Lord across all users
            let mut total_played = 0;
            let mut total_wins = 0;
            let mut total_losses = 0;
            let mut total_disconnects = 0;

            for user_stats in all_stats {
                if let Some(night_lord_stat) = user_stats.night_lord_stats.get(&night_lord_name) {
                    total_played += night_lord_stat.played;
                    total_wins += night_lord_stat.wins;
                    total_losses += night_lord_stat.losses;
                    total_disconnects += night_lord_stat.disconnects;
                }
            }

            if total_played == 0 {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "status": "error",
                    "message": "No statistics found for this Night Lord"
                }));
            }

            // Calculate win rate
            let win_rate = if total_played > 0 {
                (f64::from(total_wins) / f64::from(total_played)) * 100.0
            } else {
                0.0
            };

            let response = NightLordStatsResponse {
                name: night_lord_name,
                played: total_played,
                wins: total_wins,
                losses: total_losses,
                disconnects: total_disconnects,
                win_rate,
            };

            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            log::error!("Error fetching Night Lord statistics: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get a specific user's statistics (admin only)
#[utoipa::path(
    get,
    path = "/api/v1/statistics/users/{user_id}",
    params(
        ("user_id" = String, Path, description = "User ID to retrieve statistics for")
    ),
    responses(
        (status = 200, description = "User statistics retrieved successfully", body = UserStatistics),
        (status = 404, description = "Statistics not found for user"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/users/{user_id}")]
async fn get_user_statistics(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // Check if user has admin role (middleware already validates auth)
    let is_admin = {
        let extensions = req.extensions();
        match extensions.get::<jwt::Claims>() {
            Some(claims) => claims.role == "admin",
            None => false,
        }
    };

    // Get the requesting user's ID
    let requesting_user_id = {
        let extensions = req.extensions();
        match extensions.get::<jwt::Claims>() {
            Some(claims) => claims.sub.clone(),
            None => String::new(), // Should never happen due to middleware
        }
    };

    let user_id = path.into_inner();

    // Only allow admin to view other users' statistics
    if !is_admin && requesting_user_id != user_id {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required to view other users' statistics"
        }));
    }

    match statistics_service::get_user_statistics(&db, &user_id).await {
        Ok(Some(stats)) => HttpResponse::Ok().json(stats),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "status": "error",
            "message": "Statistics not found for user"
        })),
        Err(e) => {
            log::error!("Error fetching user statistics: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get leaderboard data
#[utoipa::path(
    get,
    path = "/api/v1/statistics/leaderboard",
    params(
        ("limit" = Option<i64>, Query, description = "Maximum number of entries to return (default: 10)")
    ),
    responses(
        (status = 200, description = "Leaderboard retrieved successfully", body = Vec<LeaderboardEntry>),
        (status = 500, description = "Internal server error")
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/leaderboard")]
async fn get_leaderboard(
    db: web::Data<Database>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let limit = query
        .get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(10);

    match statistics_service::get_leaderboard(&db, limit).await {
        Ok(leaderboard) => HttpResponse::Ok().json(leaderboard),
        Err(e) => {
            log::error!("Error fetching leaderboard: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get statistics for all Night Lords
#[utoipa::path(
    get,
    path = "/api/v1/statistics/night-lords",
    responses(
        (status = 200, description = "Night Lord statistics retrieved successfully", body = Vec<NightLordStatsResponse>),
        (status = 500, description = "Internal server error")
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/night-lords")]
async fn get_all_night_lord_statistics(db: web::Data<Database>) -> impl Responder {
    match statistics_service::get_all_user_statistics(&db).await {
        Ok(all_stats) => {
            // Collect all unique Night Lord names
            let mut night_lord_stats: std::collections::HashMap<String, NightLordStatsResponse> =
                std::collections::HashMap::new();

            // Aggregate stats for all Night Lords across all users
            for user_stats in all_stats {
                for (name, stats) in user_stats.night_lord_stats {
                    let entry = night_lord_stats.entry(name.clone()).or_insert_with(|| {
                        NightLordStatsResponse {
                            name: name.clone(),
                            played: 0,
                            wins: 0,
                            losses: 0,
                            disconnects: 0,
                            win_rate: 0.0,
                        }
                    });

                    entry.played += stats.played;
                    entry.wins += stats.wins;
                    entry.losses += stats.losses;
                    entry.disconnects += stats.disconnects;
                }
            }

            // Calculate win rates for each Night Lord
            for entry in night_lord_stats.values_mut() {
                if entry.played > 0 {
                    entry.win_rate = (f64::from(entry.wins) / f64::from(entry.played)) * 100.0;
                }
            }

            // Convert to vector and sort by win rate (descending)
            let mut result: Vec<NightLordStatsResponse> = night_lord_stats.into_values().collect();
            result.sort_by(|a, b| {
                b.win_rate
                    .partial_cmp(&a.win_rate)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });

            HttpResponse::Ok().json(result)
        }
        Err(e) => {
            log::error!("Error fetching Night Lord statistics: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get detailed information for a specific session
#[utoipa::path(
    get,
    path = "/api/v1/statistics/sessions/{session_id}",
    params(
        ("session_id" = String, Path, description = "ID of the session to retrieve details for")
    ),
    responses(
        (status = 200, description = "Session details retrieved successfully", body = SessionDetailResponse),
        (status = 404, description = "Session not found"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/sessions/{session_id}")]
async fn get_session_details(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    let session_id = path.into_inner();

    match statistics_service::get_session_details(&db, &session_id, &user_id).await {
        Ok(Some(details)) => {
            // Transform to API response format
            let response = SessionDetailResponse {
                status: "success".to_string(),
                data: details,
            };
            HttpResponse::Ok().json(response)
        }
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "status": "error",
            "message": "Session not found or you don't have access to it"
        })),
        Err(e) => {
            log::error!("Error fetching session details: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

// Add response type for session details
#[derive(Serialize, ToSchema)]
pub struct SessionDetailResponse {
    status: String,
    data: SessionDetail,
}

#[derive(Serialize, ToSchema)]
pub struct SessionDetail {
    pub session_id: String,
    pub session_name: String,
    pub night_lord: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    pub players: Vec<PlayerDetail>,
}

#[derive(Serialize, ToSchema)]
pub struct PlayerDetail {
    pub user_id: String,
    pub username: String,
    pub nightfarer: String,
    pub result: Option<String>,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

/// Get count of sessions with optional status filter
#[utoipa::path(
    get,
    path = "/api/v1/statistics/sessions-stats",
    params(
        ("status" = Option<String>, Query, description = "Filter sessions by status (e.g., 'Open', 'InProgress', 'Completed')"),
        ("is_private" = Option<bool>, Query, description = "Filter sessions by private status")
    ),
    responses(
        (status = 200, description = "Sessions count retrieved successfully", body = SessionsStatsResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/sessions-stats")]
async fn get_sessions_stats(
    db: web::Data<Database>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let status = query.get("status").cloned();

    // Parse is_private from query if provided, default to false if not provided
    let is_private = query
        .get("is_private")
        .map(|val| matches!(val.to_lowercase().as_str(), "true"))
        .or(Some(false)); // Default to false when not provided

    match session_repository::count_sessions_by_status(&db, status, is_private).await {
        Ok(count) => HttpResponse::Ok().json(json!({
            "status": "success",
            "data": {
                "count": count
            }
        })),
        Err(e) => {
            log::error!("Error fetching sessions count: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get covenant statistics
#[utoipa::path(
    get,
    path = "/api/v1/statistics/covenants",
    responses(
        (status = 200, description = "Covenant statistics retrieved successfully", body = CovenantStatsResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/covenants")]
async fn get_covenant_stats(db: web::Data<Database>) -> impl Responder {
    log::info!("Received request for covenant statistics");

    match session_service::get_covenant_stats(&db).await {
        Ok(stats) => {
            log::info!(
                "Successfully retrieved covenant statistics for {} covenants",
                stats.covenant_stats.len()
            );
            HttpResponse::Ok().json(stats)
        }
        Err(e) => {
            log::error!("Error fetching covenant statistics: {:?}", e);

            // Return a more informative error message
            let error_message = format!("Failed to retrieve covenant statistics: {e}");

            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": error_message,
                "error_type": "covenant_stats_error"
            }))
        }
    }
}

#[derive(Serialize, ToSchema)]
pub struct SessionsStatsResponse {
    pub status: String,
    pub data: SessionsStatsData,
}

#[derive(Serialize, ToSchema)]
pub struct SessionsStatsData {
    pub count: u64,
}

/// Get statistics for multiple users
#[utoipa::path(
    get,
    path = "/api/v1/statistics/batch",
    params(
        ("userIds" = String, Query, description = "Comma-separated list of user IDs to retrieve statistics for")
    ),
    responses(
        (status = 200, description = "Users statistics retrieved successfully", body = BatchUserStatsResponse),
        (status = 404, description = "Statistics not found for one or more users"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "statistics"
)]
#[get("/api/v1/statistics/batch")]
async fn get_multiple_users_statistics(
    db: web::Data<Database>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    // Get user_ids from query parameters
    let user_ids = match query.get("userIds") {
        Some(ids) => ids.split(',').map(String::from).collect::<Vec<String>>(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": "userIds parameter is required"
            }));
        }
    };

    // Collect statistics for each user
    let mut stats_collection = Vec::new();
    let mut not_found_users = Vec::new();

    for user_id in user_ids {
        // Get user statistics
        match statistics_service::get_user_statistics(&db, &user_id).await {
            Ok(Some(stats)) => {
                // Get user details for additional info
                match user_repository::find_user_by_id(&db, &user_id).await {
                    Ok(Some(user)) => {
                        stats_collection.push(UserStatsResponse {
                            user_id,
                            display_name: user
                                .display_name
                                .unwrap_or_else(|| user.username.clone()),
                            platform: user.platform,
                            experience: user.experience.to_string(),
                            covenant_name: user.covenant_name,
                            total_games: stats.total_games,
                            wins: stats.wins,
                            losses: stats.losses,
                            win_rate: stats.win_rate,
                            score: stats.score,
                        });
                    }
                    Ok(None) => {
                        // User not found in users collection but has stats
                        stats_collection.push(UserStatsResponse {
                            user_id: user_id.clone(),
                            display_name: stats.username,
                            platform: "Unknown".to_string(),
                            experience: "Unknown".to_string(),
                            covenant_name: "Unknown".to_string(),
                            total_games: stats.total_games,
                            wins: stats.wins,
                            losses: stats.losses,
                            win_rate: stats.win_rate,
                            score: stats.reputation_score,
                        });
                    }
                    Err(e) => {
                        log::error!("Error fetching user details: {:?}", e);
                        not_found_users.push(user_id.clone());
                    }
                }
            }
            Ok(None) => {
                not_found_users.push(user_id);
            }
            Err(e) => {
                log::error!("Error fetching user statistics: {:?}", e);
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "status": "error",
                    "message": e.to_string()
                }));
            }
        }
    }

    // If we found no stats for any users
    if stats_collection.is_empty() {
        return HttpResponse::NotFound().json(serde_json::json!({
            "status": "error",
            "message": "Statistics not found for any of the specified users",
            "notFoundUsers": not_found_users
        }));
    }

    // Return successful response
    HttpResponse::Ok().json(BatchUserStatsResponse {
        status: "success".to_string(),
        data: stats_collection,
        not_found_users: if not_found_users.is_empty() {
            None
        } else {
            Some(not_found_users)
        },
    })
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserStatsResponse {
    pub user_id: String,
    pub display_name: String,
    pub platform: String,
    pub experience: String,
    pub covenant_name: String,
    pub total_games: i32,
    pub wins: i32,
    pub losses: i32,
    pub win_rate: f64,
    pub score: f64,
}

#[derive(Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BatchUserStatsResponse {
    pub status: String,
    pub data: Vec<UserStatsResponse>,
    pub not_found_users: Option<Vec<String>>,
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring statistics routes");
    cfg.service(get_current_user_statistics)
        .service(get_user_statistics)
        .service(get_leaderboard)
        .service(get_night_lord_statistics)
        .service(get_all_night_lord_statistics)
        .service(get_current_user_session_history)
        .service(get_session_details)
        .service(get_sessions_stats)
        .service(get_covenant_stats)
        .service(get_multiple_users_statistics);
}
