use crate::models::error::AppError;
use crate::models::message::{SendMessageRequest, UnreadCountResponse};
use crate::services::message_service;
use crate::utils::jwt;
use actix_web::{
    get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder, ResponseError,
};
use mongodb::Database;
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct PaginationQuery {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

/// Get user's inbox/conversations
#[utoipa::path(
    get,
    path = "/api/v1/messages/conversations/{user_id}",
    params(
        ("user_id" = String, Path, description = "User ID to get conversations for"),
        ("page" = Option<i64>, Query, description = "Page number (default: 1)"),
        ("limit" = Option<i64>, Query, description = "Items per page (default: 20, max: 50)")
    ),
    responses(
        (status = 200, description = "Conversations retrieved successfully", body = ConversationsListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "messages"
)]
#[get("/api/v1/messages/conversations/{user_id}")]
async fn get_conversations(
    db: web::Data<Database>,
    path: web::Path<String>,
    query: web::Query<PaginationQuery>,
    req: HttpRequest,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    let claims = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.clone()
    };

    let user_id = path.into_inner();

    // Verify user is accessing their own conversations or is an admin
    if claims.sub != user_id && claims.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Unauthorized to access these conversations"
        }));
    }

    // Parse pagination parameters
    let page = query.page.unwrap_or(1).max(1) as u64;
    let limit = query.limit.unwrap_or(20).min(50).max(1) as u64;

    match message_service::get_user_conversations(&db, &user_id, page, limit).await {
        Ok(conversations) => {
            // Get total count for pagination
            let total = message_service::count_user_conversations(&db, &user_id)
                .await
                .unwrap_or(0);

            // Calculate total pages
            let total_pages = if limit > 0 { total.div_ceil(limit) } else { 0 };

            HttpResponse::Ok().json(serde_json::json!({
                "status": "success",
                "data": {
                    "conversations": conversations,
                    "pagination": {
                        "total": total,
                        "page": page,
                        "limit": limit,
                        "total_pages": total_pages
                    }
                }
            }))
        }
        Err(e) => {
            log::error!("Error fetching conversations: {:?}", e);
            e.error_response()
        }
    }
}

/// Get messages in a conversation (paginated)
#[utoipa::path(
    get,
    path = "/api/v1/messages/conversations/{conversation_id}/messages",
    params(
        ("conversation_id" = String, Path, description = "Conversation ID to get messages for"),
        ("page" = Option<i64>, Query, description = "Page number (default: 1)"),
        ("limit" = Option<i64>, Query, description = "Items per page (default: 20, max: 50)")
    ),
    responses(
        (status = 200, description = "Messages retrieved successfully", body = MessagesListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Conversation not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "messages"
)]
#[get("/api/v1/messages/conversations/{conversation_id}/messages")]
async fn get_messages(
    db: web::Data<Database>,
    path: web::Path<String>,
    query: web::Query<PaginationQuery>,
    req: HttpRequest,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    let claims = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.clone()
    };

    let conversation_id = path.into_inner();

    // Parse pagination parameters
    let page = query.page.unwrap_or(1).max(1) as u64;
    let limit = query.limit.unwrap_or(20).min(50).max(1) as u64;

    match message_service::get_conversation_messages(
        &db,
        &conversation_id,
        &claims.sub,
        page,
        limit,
    )
    .await
    {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error fetching messages: {:?}", e);
            e.error_response()
        }
    }
}

/// Send a message
#[utoipa::path(
    post,
    path = "/api/v1/messages/conversations/{conversation_id}/messages",
    request_body = SendMessageRequest,
    params(
        ("conversation_id" = String, Path, description = "Conversation ID to send message to")
    ),
    responses(
        (status = 201, description = "Message sent successfully", body = MessageResponse),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Conversation not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "messages"
)]
#[post("/api/v1/messages/conversations/{conversation_id}/messages")]
async fn send_message(
    db: web::Data<Database>,
    path: web::Path<String>,
    message_data: web::Json<SendMessageRequest>,
    req: HttpRequest,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    let claims = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.clone()
    };

    let conversation_id = path.into_inner();

    match message_service::send_message(&db, &conversation_id, &claims.sub, &message_data.content)
        .await
    {
        Ok(message) => HttpResponse::Created().json(message),
        Err(e) => {
            log::error!("Error sending message: {:?}", e);
            e.error_response()
        }
    }
}

/// Mark messages as read
#[utoipa::path(
    put,
    path = "/api/v1/messages/conversations/{conversation_id}/read",
    params(
        ("conversation_id" = String, Path, description = "Conversation ID to mark messages as read")
    ),
    responses(
        (status = 200, description = "Messages marked as read successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Conversation not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "messages"
)]
#[put("/api/v1/messages/conversations/{conversation_id}/read")]
async fn mark_as_read(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    let claims = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.clone()
    };

    let conversation_id = path.into_inner();

    match message_service::mark_messages_as_read(&db, &conversation_id, &claims.sub).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Messages marked as read"
        })),
        Err(e) => {
            log::error!("Error marking messages as read: {:?}", e);
            e.error_response()
        }
    }
}

/// Get or create conversation with a friend
#[utoipa::path(
    get,
    path = "/api/v1/messages/conversations/with/{friend_id}",
    params(
        ("friend_id" = String, Path, description = "Friend ID to get or create conversation with")
    ),
    responses(
        (status = 200, description = "Conversation retrieved or created successfully", body = ConversationResponse),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User or friend not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "messages"
)]
#[get("/api/v1/messages/conversations/with/{friend_id}")]
async fn get_or_create_conversation(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    let claims = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.clone()
    };

    let friend_id = path.into_inner();

    match message_service::get_or_create_conversation(&db, &claims.sub, &friend_id).await {
        Ok(conversation) => HttpResponse::Ok().json(conversation),
        Err(e) => {
            log::error!("Error getting/creating conversation: {:?}", e);
            e.error_response()
        }
    }
}

/// Get unread message count for user
#[utoipa::path(
    get,
    path = "/api/v1/messages/unread-count/{user_id}",
    params(
        ("user_id" = String, Path, description = "User ID to get unread count for")
    ),
    responses(
        (status = 200, description = "Unread count retrieved successfully", body = UnreadCountResponse),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "messages"
)]
#[get("/api/v1/messages/unread-count/{user_id}")]
async fn get_unread_count(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    let claims = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.clone()
    };

    let user_id = path.into_inner();

    // Verify user is accessing their own unread count or is an admin
    if claims.sub != user_id && claims.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Unauthorized to access this unread count"
        }));
    }

    match message_service::get_user_unread_count(&db, &user_id).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error getting unread count: {:?}", e);
            e.error_response()
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring message routes");
    cfg.service(get_conversations);
    cfg.service(get_messages);
    cfg.service(send_message);
    cfg.service(mark_as_read);
    cfg.service(get_or_create_conversation);
    cfg.service(get_unread_count);
}
