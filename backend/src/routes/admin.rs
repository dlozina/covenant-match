use crate::models::admin::{
    AdminDashboardStats, AdminSessionResponse, AdminSessionsResponse, SystemInfo,
};
use crate::models::error::AppError;
use crate::services::{admin_service, session_service};
use actix_web::{delete, get, web, HttpResponse, Responder, ResponseError};
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

/// Get all sessions with pagination for admin
#[utoipa::path(
    get,
    path = "/api/v1/admin/sessions",
    params(
        ("page" = Option<u64>, Query, description = "Page number starting from 1"),
        ("limit" = Option<u64>, Query, description = "Number of items per page"),
        ("status" = Option<String>, Query, description = "Filter by session status (Open, Full, InProgress, Completed, Cancelled)"),
    ),
    responses(
        (status = 200, description = "Successfully retrieved sessions", body = AdminSessionsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/sessions")]
async fn get_admin_sessions(
    db: web::Data<Database>,
    query: web::Query<AdminSessionsQuery>,
) -> impl Responder {
    match admin_service::get_sessions_paginated(
        &db,
        query.page.unwrap_or(1),
        query.limit.unwrap_or(20),
        query.status.clone(),
    )
    .await
    {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error fetching admin sessions: {:?}", e);
            e.error_response()
        }
    }
}

/// Get a specific session by ID for admin
#[utoipa::path(
    get,
    path = "/api/v1/admin/sessions/{session_id}",
    params(
        ("session_id" = String, Path, description = "Session ID"),
    ),
    responses(
        (status = 200, description = "Successfully retrieved session", body = AdminSessionResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/sessions/{session_id}")]
async fn get_admin_session_by_id(
    db: web::Data<Database>,
    path: web::Path<String>,
) -> impl Responder {
    let session_id = path.into_inner();

    match admin_service::get_session_by_id(&db, &session_id).await {
        Ok(session) => HttpResponse::Ok().json(session),
        Err(e) => {
            log::error!("Error fetching admin session {}: {:?}", session_id, e);
            e.error_response()
        }
    }
}

/// Delete a session by ID for admin
#[utoipa::path(
    delete,
    path = "/api/v1/admin/sessions/{session_id}",
    params(
        ("session_id" = String, Path, description = "Session ID"),
    ),
    responses(
        (status = 204, description = "Session deleted successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[delete("/api/v1/admin/sessions/{session_id}")]
async fn delete_admin_session(db: web::Data<Database>, path: web::Path<String>) -> impl Responder {
    let session_id = path.into_inner();

    match admin_service::delete_session(&db, &session_id).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Error deleting session {}: {:?}", session_id, e);
            e.error_response()
        }
    }
}

/// Parameters for sessions query
#[derive(serde::Deserialize)]
struct AdminSessionsQuery {
    page: Option<u64>,
    limit: Option<u64>,
    status: Option<String>,
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring admin routes");
    cfg.service(get_dashboard_stats);
    cfg.service(get_system_info);
    cfg.service(get_admin_sessions);
    cfg.service(get_admin_session_by_id);
    cfg.service(delete_admin_session);
}
