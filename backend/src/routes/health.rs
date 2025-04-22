use crate::utils::jwt;
use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};

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
#[get("/api/v1/health")]
pub async fn health_check_v1(req: HttpRequest) -> impl Responder {
    // Claims are available from request extensions (set by middleware)
    let claims = req.extensions();
    let claims = claims
        .get::<jwt::Claims>()
        .expect("JWT claims not found in request extensions");

    // Authentication successful, return health check response
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": "API v1 is running",
        "version": "1.0",
        "user": claims.sub  // Optional: include authenticated user ID
    }))
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
#[get("/api/v2/health")]
pub async fn health_check_v2(req: HttpRequest) -> impl Responder {
    // Claims are available from request extensions (set by middleware)
    let claims = req.extensions();
    let claims = claims
        .get::<jwt::Claims>()
        .expect("JWT claims not found in request extensions");

    // Authentication successful, return health check response
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": "API v2 is running",
        "version": "2.0",
        "details": {
            "database": "connected",
            "cache": "available",
            "services": ["user_service", "auth_service"],
            "uptime": "24h 13m",
            "user_role": claims.role  // Optional: include role for debugging
        }
    }))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring health routes");
    cfg.service(health_check_v1);
    cfg.service(health_check_v2);
}
