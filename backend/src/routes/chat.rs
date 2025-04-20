use crate::services::chat_service::ChatService;
use crate::services::user_service;
use crate::utils::jwt;
use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use log::debug;
use mongodb::Database;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Deserialize)]
pub struct ChatHistoryParams {
    session_id: String,
    limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ChatMessage {
    sender_id: String,
    sender_name: String,
    message: String,
    timestamp: i64,
}

/// Get chat history for a session
#[utoipa::path(
    get,
    path = "/api/v1/chat/history",
    params(
        ("session_id" = String, Query, description = "Session ID to retrieve chat history for"),
        ("limit" = Option<i64>, Query, description = "Maximum number of messages to retrieve (default: 30)")
    ),
    responses(
        (status = 200, description = "Chat history retrieved successfully", body = Vec<ChatMessage>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "chat"
)]
#[get("/api/v1/chat/history")]
async fn get_chat_history(
    query: web::Query<ChatHistoryParams>,
    db: web::Data<Database>,
    req: HttpRequest,
) -> impl Responder {
    let session_id = &query.session_id;
    let limit = query.limit.unwrap_or(30);

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    debug!(
        "Fetching chat history for session: {}, user: {}",
        session_id, user_id
    );

    // Create a chat service instance
    let chat_service = ChatService::new(&db);

    // Mark messages as delivered
    if let Err(e) = chat_service
        .mark_messages_delivered(session_id, &user_id)
        .await
    {
        debug!("Error marking messages as delivered: {}", e);
    }

    // Get chat history
    match chat_service.get_chat_history(session_id, limit).await {
        Ok(messages) => {
            // Collect all unique user IDs from messages
            let user_ids: Vec<String> = messages
                .iter()
                .map(|msg| msg.sender_id.clone())
                .collect::<std::collections::HashSet<String>>()
                .into_iter()
                .collect();

            // Create a map to store user ID -> username
            let mut user_map: HashMap<String, String> = HashMap::new();

            // Fetch user information for each user ID
            for user_id in user_ids {
                match user_service::get_user_by_id(&db, &user_id).await {
                    Ok(user) => {
                        user_map.insert(user_id, user.username);
                    }
                    Err(e) => {
                        debug!("Error fetching user {}: {}", user_id, e);
                        // Use the stored name if available, otherwise use Unknown User
                    }
                }
            }

            let response_messages: Vec<ChatMessage> = messages
                .into_iter()
                .map(|msg| {
                    // Get username from map or use the stored name
                    let sender_name = user_map
                        .get(&msg.sender_id)
                        .cloned()
                        .unwrap_or(msg.sender_name);

                    ChatMessage {
                        sender_id: msg.sender_id,
                        sender_name,
                        message: msg.content,
                        timestamp: msg.timestamp.timestamp_millis(),
                    }
                })
                .collect();

            HttpResponse::Ok().json(response_messages)
        }
        Err(e) => {
            debug!("Error fetching chat history: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": "Failed to fetch chat history"
            }))
        }
    }
}

// Configure chat routes
pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(get_chat_history);
}
