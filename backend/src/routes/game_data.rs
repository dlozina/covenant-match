use crate::services::game_data_service;
use actix_web::{get, web, HttpResponse, Responder};
use mongodb::Database;

/// Get all game data (platforms, regions, and covenants)
#[utoipa::path(
    get,
    path = "/api/v1/game-data",
    responses(
        (status = 200, description = "All game data retrieved successfully", body = GameDataResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "game-data"
)]
#[get("/api/v1/game-data")]
async fn get_game_data(db: web::Data<Database>) -> impl Responder {
    match game_data_service::get_all_game_data(&db).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(e) => {
            log::error!("Error fetching game data: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get all platforms
#[utoipa::path(
    get,
    path = "/api/v1/platforms",
    responses(
        (status = 200, description = "Platforms retrieved successfully", body = Vec<PlatformResponse>),
        (status = 500, description = "Internal server error")
    ),
    tag = "game-data"
)]
#[get("/api/v1/platforms")]
async fn get_platforms(db: web::Data<Database>) -> impl Responder {
    match game_data_service::get_all_platforms(&db).await {
        Ok(platforms) => HttpResponse::Ok().json(platforms),
        Err(e) => {
            log::error!("Error fetching platforms: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get all regions
#[utoipa::path(
    get,
    path = "/api/v1/regions",
    responses(
        (status = 200, description = "Regions retrieved successfully", body = Vec<RegionResponse>),
        (status = 500, description = "Internal server error")
    ),
    tag = "game-data"
)]
#[get("/api/v1/regions")]
async fn get_regions(db: web::Data<Database>) -> impl Responder {
    match game_data_service::get_all_regions(&db).await {
        Ok(regions) => HttpResponse::Ok().json(regions),
        Err(e) => {
            log::error!("Error fetching regions: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get all covenants
#[utoipa::path(
    get,
    path = "/api/v1/covenants",
    responses(
        (status = 200, description = "Covenants retrieved successfully", body = Vec<CovenantResponse>),
        (status = 500, description = "Internal server error")
    ),
    tag = "game-data"
)]
#[get("/api/v1/covenants")]
async fn get_covenants(db: web::Data<Database>) -> impl Responder {
    match game_data_service::get_all_covenants(&db).await {
        Ok(covenants) => HttpResponse::Ok().json(covenants),
        Err(e) => {
            log::error!("Error fetching covenants: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(get_game_data)
        .service(get_platforms)
        .service(get_regions)
        .service(get_covenants);
}
