use crate::models::admin::{AdminDashboardStats, SystemInfo};
use crate::models::error::AppError;
use crate::services::admin_service;
use actix_web::{get, web, HttpResponse, Responder, ResponseError};
use mongodb::Database;

/// Get admin dashboard statistics
#[utoipa::path(
    get,
    path = "/api/v1/admin/dashboard",
    responses(
        (status = 200, description = "Dashboard statistics retrieved successfully", body = AdminDashboardStats),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/dashboard")]
async fn get_dashboard_stats(db: web::Data<Database>) -> impl Responder {
    match admin_service::get_dashboard_stats(&db).await {
        Ok(stats) => HttpResponse::Ok().json(stats),
        Err(e) => {
            log::error!("Error fetching admin dashboard stats: {:?}", e);
            e.error_response()
        }
    }
}

/// Get system information
#[utoipa::path(
    get,
    path = "/api/v1/admin/system-info",
    responses(
        (status = 200, description = "System information retrieved successfully", body = SystemInfo),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/system-info")]
async fn get_system_info() -> impl Responder {
    match admin_service::get_system_info().await {
        Ok(info) => HttpResponse::Ok().json(info),
        Err(e) => {
            log::error!("Error fetching system info: {:?}", e);
            e.error_response()
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring admin routes");
    cfg.service(get_dashboard_stats);
    cfg.service(get_system_info);
}
