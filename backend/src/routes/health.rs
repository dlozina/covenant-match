use std::net::IpAddr;

use crate::utils::jwt;
use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use log::error;
use mongodb::{bson::doc, Database};
use serde_json::json;

/// Check if the database connection is working by running a ping command
async fn check_database_connection(db: &Database) -> bool {
    match db.run_command(doc! { "ping": 1 }).await {
        Ok(_) => true,
        Err(e) => {
            error!("Database connection check failed: {:?}", e);
            false
        }
    }
}

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

/// Health check internal endpoint -> used by Docker Swarm to check if the service is healthy
#[get("/health")]
pub async fn health_check_internal(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Get connection info and host
    let host = req
        .connection_info()
        .realip_remote_addr()
        .unwrap_or("unknown")
        .to_string();

    log::info!("Host for internal health check: {}", host);

    // Parse IP and check if it's allowed
    if let Ok(ip) = host.parse::<IpAddr>() {
        let is_allowed = match ip {
            IpAddr::V4(ipv4) => {
                let octets = ipv4.octets();
                
                // Check if IP is loopback (127.0.0.0/8)
                let is_loopback = octets[0] == 127;
                
                // Check if IP is in 10.0.0.0/8
                let is_class_a = octets[0] == 10;
                
                // Check if IP is in 172.16.0.0/12
                let is_class_b = octets[0] == 172 && (octets[1] >= 16 && octets[1] <= 31);
                
                // Check if IP is in 192.168.0.0/16
                let is_class_c = octets[0] == 192 && octets[1] == 168;
                
                is_loopback || is_class_a || is_class_b || is_class_c
            },
            IpAddr::V6(ipv6) => ipv6.is_loopback() // Only allow IPv6 loopback
        };
        
        if !is_allowed {
            log::warn!("Unauthorized IP attempted to access health check: {}", host);
            return HttpResponse::NotFound().finish();
        }
    } else {
        // Couldn't parse IP, also return 404
        log::warn!("Invalid IP attempted to access health check: {}", host);
        return HttpResponse::NotFound().finish();
    }

    // If we get here, the request is from an allowed address
    // Perform actual health checks
    let db_status = check_database_connection(&db).await;
    log::info!("Database status: {}", db_status);

    HttpResponse::Ok().json(json!({
        "status": if db_status { "healthy" } else { "degraded" }
    }))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring health routes");
    cfg.service(health_check_v1);
    cfg.service(health_check_v2);
    cfg.service(health_check_internal);
}
