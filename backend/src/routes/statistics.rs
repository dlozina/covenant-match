use actix_web::{web, HttpResponse, Responder, get};
use mongodb::Database;
use crate::services::statistics_service;

#[get("/statistics/users/{user_id}")]
async fn get_user_statistics(
    db: web::Data<Database>,
    path: web::Path<String>,
) -> impl Responder {
    let user_id = path.into_inner();
    
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

#[get("/statistics/leaderboard")]
async fn get_leaderboard(
    db: web::Data<Database>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let limit = query.get("limit").and_then(|l| l.parse::<i64>().ok()).unwrap_or(10);
    
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

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(get_user_statistics)
       .service(get_leaderboard);
}
