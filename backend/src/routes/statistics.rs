use crate::services::statistics_service;
use crate::utils::jwt;
use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use mongodb::Database;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct NightLordStatsResponse {
    name: String,
    played: i32,
    wins: i32,
    losses: i32,
    disconnects: i32,
    win_rate: f64,
}

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
        let claims = extensions.get::<jwt::Claims>().unwrap();
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
                (total_wins as f64 / total_played as f64) * 100.0
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
            None => "".to_string(), // Should never happen due to middleware
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
                    entry.win_rate = (entry.wins as f64 / entry.played as f64) * 100.0;
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

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring statistics routes");
    cfg.service(get_current_user_statistics)
        .service(get_user_statistics)
        .service(get_leaderboard)
        .service(get_night_lord_statistics)
        .service(get_all_night_lord_statistics);
}
