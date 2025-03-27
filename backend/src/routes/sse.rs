use actix::prelude::*;
use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use bytes::Bytes;
use futures::stream::StreamExt;
use log::{debug, error, info};
use serde_json::json;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use utoipa::IntoParams;

use crate::sse::messages::{ConnectSSE, GetSessionStatus, ServerMessage};
use crate::sse::partition::SessionRouter;
use crate::utils::jwt;

/// Path parameter for session events
#[derive(serde::Deserialize, IntoParams, Clone)]
pub struct SessionEventParams {
    /// Session ID to receive events from
    session_id: String,
}

/// SSE endpoint for real-time updates
#[utoipa::path(
    get,
    path = "/api/v1/sse/sessions/{session_id}/events",
    params(SessionEventParams),
    responses(
        (status = 200, description = "SSE stream established", content_type = "text/event-stream"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "realtime"
)]
#[get("/api/v1/sse/sessions/{session_id}/events")]
pub async fn events_route(
    req: HttpRequest,
    path: web::Path<SessionEventParams>,
    session_router: web::Data<Addr<SessionRouter>>,
) -> impl Responder {
    let session_event_params = path.into_inner();
    let session_id = session_event_params.session_id.clone();

    let user_id = {
        let extensions = req.extensions();
        let claims = extensions.get::<jwt::Claims>().unwrap();
        claims.sub.clone()
    };

    info!(
        "New SSE connection established - User: {}, Session: {}",
        user_id, session_id
    );

    // Create channel for sending events to client
    let (tx, rx) = mpsc::channel::<ServerMessage>(100);

    // Clone these values for use after the closure
    let user_id_log = user_id.clone();
    let session_id_log = session_id.clone();

    // Register client with session router, which will route to the correct partition
    session_router.do_send(ConnectSSE {
        client_id: user_id.clone(),
        session_id: session_id.clone(),
        sender: tx,
    });

    // Convert the receiver to a stream
    let stream = ReceiverStream::new(rx).map(move |msg| {
        // Format the message as an SSE event
        let event_type = &msg.message_type;
        let data = serde_json::to_string(&msg.data).unwrap_or_default();
        let timestamp = msg.timestamp;

        // Log the event type and data
        if event_type == "heartbeat" {
            info!(
                "❤️ SSE heartbeat (timestamp: {}) for client {} in session {}",
                timestamp, user_id, session_id
            );
        } else {
            debug!(
                "SSE event (type: {}, timestamp: {}) for client {} in session {}",
                event_type, timestamp, user_id, session_id
            );
        }

        // Format as SSE event
        let sse_data = if event_type == "heartbeat" {
            format!(": keepalive\nevent: {}\ndata: {}\n\n", event_type, data)
        } else {
            format!("event: {}\ndata: {}\n\n", event_type, data)
        };

        Ok::<Bytes, std::convert::Infallible>(Bytes::from(sse_data))
    });

    info!(
        "SSE stream ready for client {} in session {}",
        user_id_log, session_id_log
    );

    // Return SSE response
    HttpResponse::Ok()
        .append_header(("Content-Type", "text/event-stream"))
        .append_header(("Cache-Control", "no-cache"))
        .append_header(("Connection", "keep-alive"))
        // Add these headers to prevent proxies from closing the connection
        .append_header(("X-Accel-Buffering", "no"))
        .append_header(("Access-Control-Allow-Origin", "*"))
        // Increase timeouts
        .append_header(("Keep-Alive", "timeout=60"))
        // Add additional headers to prevent connection closures
        .append_header(("Access-Control-Allow-Credentials", "true"))
        .append_header(("Access-Control-Expose-Headers", "Content-Type"))
        // Prevent browser/proxy timeouts with periodic response
        .append_header(("Ping-Interval", "15"))
        .streaming(stream)
}

/// SSE status endpoint
#[utoipa::path(
    get,
    path = "/api/v1/sse/status",
    responses(
        (status = 200, description = "Current SSE status", body = SseSessionStatus),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "realtime"
)]
#[get("/api/v1/sse/status")]
pub async fn events_status(
    session_router: web::Data<Addr<SessionRouter>>,
    req: HttpRequest,
) -> impl Responder {
    // Get the user role from the request extensions
    let user_role = {
        let extensions = req.extensions();
        let claims = extensions.get::<jwt::Claims>().unwrap();
        claims.role.clone()
    };

    // Middleware already checked admin role, but we can double-check here
    if user_role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    // Get the status from the session router, which will aggregate from all partitions
    let status_result = session_router.send(GetSessionStatus {}).await;

    match status_result {
        Ok(status) => HttpResponse::Ok().json(status),
        Err(e) => {
            error!("Failed to get SSE status: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to get SSE status"
            }))
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(events_route);
    cfg.service(events_status);
}
