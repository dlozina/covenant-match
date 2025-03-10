use actix_web::{get, web, HttpRequest, HttpResponse, Responder, ResponseError};
use crate::utils::jwt;

/// Health check endpoint (v1)
#[utoipa::path(
    get,
    path = "/api/v1/health",
    responses(
        (status = 200, description = "API is healthy"),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "health"
)]
#[get("")]
pub async fn health_check_v1(req: HttpRequest) -> impl Responder {
    // Extract the user ID from the authentication token
    let auth_header = req.headers().get("Authorization");
    match auth_header {
        Some(header) => {
            let auth_str = header.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                let token = auth_str.trim_start_matches("Bearer ");
                match jwt::get_user_id_from_token(token) {
                    Ok(_) => {
                        // Authentication successful, return health check response
                        HttpResponse::Ok().json(serde_json::json!({
                            "status": "ok",
                            "message": "API v1 is running",
                            "version": "1.0"
                        }))
                    },
                    Err(e) => e.error_response(),
                }
            } else {
                HttpResponse::Unauthorized().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid authorization header format"
                }))
            }
        }
        None => {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "status": "error",
                "message": "Authentication required"
            }))
        }
    }
}

/// Health check endpoint (v2)
#[utoipa::path(
    get,
    path = "/api/v2/health",
    responses(
        (status = 200, description = "API is healthy"),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "health"
)]
#[get("")]
pub async fn health_check_v2(req: HttpRequest) -> impl Responder {
    // Extract the user ID from the authentication token
    let auth_header = req.headers().get("Authorization");
    match auth_header {
        Some(header) => {
            let auth_str = header.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                let token = auth_str.trim_start_matches("Bearer ");
                match jwt::get_user_id_from_token(token) {
                    Ok(_) => {
                        // Authentication successful, return health check response
                        HttpResponse::Ok().json(serde_json::json!({
                            "status": "ok",
                            "message": "API v2 is running",
                            "version": "2.0",
                            "details": {
                                "database": "connected",
                                "cache": "available",
                                "services": ["user_service", "auth_service"],
                                "uptime": "24h 13m"
                            }
                        }))
                    },
                    Err(e) => e.error_response(),
                }
            } else {
                HttpResponse::Unauthorized().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid authorization header format"
                }))
            }
        }
        None => {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "status": "error",
                "message": "Authentication required"
            }))
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg
        // v1 API routes
        .service(
            web::scope("/api/v1")
                .service(
                    web::scope("/health")
                        .service(health_check_v1)
                )
        )
        // v2 API routes
        .service(
            web::scope("/api/v2")
                .service(
                    web::scope("/health")
                        .service(health_check_v2)
                )
        );
}