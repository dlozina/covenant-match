use actix::prelude::*;
use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use log::info;
use utoipa::IntoParams;

use crate::ws::server::ws_route;
use crate::ws::session::SessionManager;

/// Path parameter for WebSocket session
#[derive(serde::Deserialize, IntoParams, Clone)]
pub struct WsSessionParams {
    /// Session ID to connect to
    session_id: String,
}

/// WebSocket endpoint for real-time updates
#[utoipa::path(
    get,
    path = "/api/v1/ws/sessions/{session_id}",
    params(WsSessionParams),
    responses(
        (status = 101, description = "WebSocket connection upgraded"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "realtime"
)]
#[get("/api/v1/ws/sessions/{session_id}")]
pub async fn ws_session_route(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<WsSessionParams>,
    session_manager: web::Data<Addr<SessionManager>>,
) -> impl Responder {
    let session_id = path.into_inner().session_id;

    info!("WebSocket connection request for session: {}", session_id);

    ws_route(req, stream, web::Path::from(session_id), session_manager).await
}

/// WebSocket status endpoint
#[utoipa::path(
    get,
    path = "/api/v1/ws/status",
    responses(
        (status = 200, description = "Current WebSocket status"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "realtime"
)]
#[get("/api/v1/ws/status")]
pub async fn ws_status(
    req: HttpRequest,
) -> impl Responder {
    // Get the user role from the request extensions
    let user_role = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<crate::utils::jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.role.clone()
    };

    // Middleware already checked admin role, but we can double-check here
    if user_role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "connections_count": "Status check not implemented yet"
    }))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(ws_session_route);
    cfg.service(ws_status);
}
