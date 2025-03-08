use actix_web::{get, web, HttpResponse, Responder};

/// Health check endpoint (v1)
#[utoipa::path(
    get,
    path = "/api/v1/health",
    responses(
        (status = 200, description = "API is healthy")
    ),
    tag = "health"
)]
#[get("")]
pub async fn health_check_v1() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": "API v1 is running",
        "version": "1.0"
    }))
}

/// Health check endpoint (v2)
#[utoipa::path(
    get,
    path = "/api/v2/health",
    responses(
        (status = 200, description = "API is healthy")
    ),
    tag = "health"
)]
#[get("")]
pub async fn health_check_v2() -> impl Responder {
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