use actix::prelude::*;
use actix_web::{web, HttpRequest, HttpResponse, Responder};
use bytes::Bytes;
use futures::stream::StreamExt;
use log::{debug, error, info};
use serde_json::json;
use std::collections::HashMap;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;

use crate::sse::messages::{ConnectSSE, GetSessionStatus, ServerMessage};
use crate::sse::session::SessionManager;
use crate::utils::jwt;

// SSE endpoint for real-time updates
pub async fn events_route(
    req: HttpRequest,
    path: web::Path<String>,
    query: web::Query<HashMap<String, String>>,
    session_manager: web::Data<Addr<SessionManager>>,
) -> impl Responder {
    let session_id = path.into_inner();

    // Try to get token from query parameter
    let token = query.get("token").cloned();

    // Validate token
    if let Some(token) = token {
        match jwt::validate_token(&token) {
            Ok(claims) => {
                info!("SSE connection authorized for user: {}", claims.sub);

                // Create channel for sending events to client
                let (tx, rx) = mpsc::channel::<ServerMessage>(100);

                // Register client with session manager
                session_manager.do_send(ConnectSSE {
                    client_id: claims.sub.clone(),
                    session_id: session_id.clone(),
                    sender: tx,
                });

                // Convert the receiver to a stream
                let stream = ReceiverStream::new(rx).map(move |msg| {
                    // Format the message as an SSE event
                    let event_type = &msg.message_type;
                    let data = serde_json::to_string(&msg.data).unwrap_or_default();

                    // Debug log the exact SSE event we're sending
                    if event_type == "heartbeat" {
                        info!(
                            "❤️ Sending SSE heartbeat event to client {}: event: {}, data: {}",
                            claims.sub, event_type, data
                        );
                    } else {
                        debug!(
                            "Sending SSE event to client {}: event: {}, data: {}",
                            claims.sub, event_type, data
                        );
                    }

                    // Format as SSE event
                    let sse_data = if event_type == "heartbeat" {
                        // For heartbeats, add a comment line before the event to keep the connection alive
                        format!(": keepalive\nevent: {}\ndata: {}\n\n", event_type, data)
                    } else {
                        format!("event: {}\ndata: {}\n\n", event_type, data)
                    };

                    // Log the raw SSE data in a condensed single-line format for debugging
                    let formatted = format!("event: {}\ndata: {}\n\n", event_type, data);
                    info!("Sending raw SSE: {:?}", formatted.replace("\n", "\\n"));

                    Ok::<Bytes, std::convert::Infallible>(Bytes::from(sse_data))
                });

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
            Err(e) => {
                error!("Token validation failed: {:?}", e);
                HttpResponse::Unauthorized().json(json!({
                    "error": "Invalid token"
                }))
            }
        }
    } else {
        error!("No token provided for SSE connection");
        HttpResponse::Unauthorized().json(json!({
            "error": "No token provided"
        }))
    }
}

// New endpoint to check the status of SSE connections
pub async fn events_status(sse_session_manager: web::Data<Addr<SessionManager>>) -> impl Responder {
    info!("Request received for SSE status");

    // Get the status from the session manager
    let status_result = sse_session_manager.send(GetSessionStatus {}).await;

    match status_result {
        Ok(status) => {
            info!(
                "SSE status successfully retrieved: {} sessions, {} clients",
                status.total_sessions, status.total_clients
            );
            HttpResponse::Ok().json(status)
        }
        Err(e) => {
            error!("Failed to get SSE status: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": "Failed to get SSE status"
            }))
        }
    }
}
