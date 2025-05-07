use crate::middleware::auth::Auth;
use crate::models::admin::{
    AdminChatResponse, AdminSessionsQuery, ChatHistoryParams, ChatMessageResponseDto,
    CreateFeatureFlagDto, DeleteMessagesParams, LoginAttemptsQuery, LoginAttemptsResponse,
    PatchFeatureFlagDto, UserInfoDto,
};
use crate::models::error::AppError;
use crate::services::{admin_service, chat_service, user_service};
use crate::utils::request::is_admin;
use crate::ws::messages::GetConnectionStats;
use crate::ws::session::SessionManager;
use actix::Addr;
use actix_web::{delete, get, post, put, web, HttpRequest, HttpResponse, Responder, ResponseError};
use chrono::Utc;
use futures::StreamExt;
use log::{debug, info};
use mongodb::{bson::doc, Database};

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
async fn get_dashboard_stats(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

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
async fn get_system_info(req: HttpRequest) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

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
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

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
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

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
async fn delete_admin_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    let session_id = path.into_inner();

    match admin_service::delete_session(&db, &session_id).await {
        Ok(()) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Error deleting session {}: {:?}", session_id, e);
            e.error_response()
        }
    }
}

/// Get chat history for admin
#[utoipa::path(
    get,
    path = "/api/v1/admin/chat",
    params(
        ("session_id" = Option<String>, Query, description = "Optional session ID to filter chat history"),
        ("limit" = Option<i64>, Query, description = "Maximum number of messages to retrieve (default: 100)"),
        ("from_date" = Option<String>, Query, description = "Optional start date (ISO format) to filter messages"),
        ("to_date" = Option<String>, Query, description = "Optional end date (ISO format) to filter messages")
    ),
    responses(
        (status = 200, description = "Chat history retrieved successfully", body = AdminChatResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/chat")]
async fn get_admin_chat_history(
    query: web::Query<ChatHistoryParams>,
    db: web::Data<Database>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    let limit = query.limit.unwrap_or(100);

    // Create a chat service instance
    let chat_service = chat_service::ChatService::new(&db);

    // Get chat history from all or a specific session
    match chat_service
        .get_admin_chat_history(
            query.session_id.as_deref(),
            limit,
            query.from_date.as_deref(),
            query.to_date.as_deref(),
        )
        .await
    {
        Ok(result) => {
            // Collect unique sender IDs
            let sender_ids: Vec<String> = result
                .messages
                .iter()
                .map(|msg| msg.sender_id.clone())
                .collect::<std::collections::HashSet<String>>()
                .into_iter()
                .collect();

            // Get user information for all senders
            let mut user_info_map = std::collections::HashMap::new();

            for sender_id in sender_ids {
                match user_service::get_user_by_id(&db, &sender_id).await {
                    Ok(user) => {
                        user_info_map.insert(
                            sender_id,
                            UserInfoDto {
                                username: Some(user.username),
                                display_name: user.display_name,
                                email: Some(user.email),
                                role: Some(user.role),
                                avatar_url: user.avatar_url,
                            },
                        );
                    }
                    Err(e) => {
                        debug!("Could not find user info for ID {}: {:?}", sender_id, e);
                        // Continue with other users even if one fails
                    }
                }
            }

            // Map messages to response DTOs with user info
            let response_messages: Vec<ChatMessageResponseDto> = result
                .messages
                .into_iter()
                .map(|msg| {
                    let user = user_info_map.get(&msg.sender_id).cloned();

                    ChatMessageResponseDto {
                        sender_id: msg.sender_id.clone(),
                        sender_name: msg.sender_name,
                        message: msg.content,
                        timestamp: msg.timestamp.timestamp_millis(),
                        session_id: msg.session_id,
                        user,
                    }
                })
                .collect();

            HttpResponse::Ok().json(AdminChatResponse {
                messages: response_messages,
                total: result.total,
            })
        }
        Err(e) => {
            debug!("Error fetching admin chat history: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": "Failed to fetch chat history"
            }))
        }
    }
}

/// Delete chat messages for admin by session or date range
#[utoipa::path(
    delete,
    path = "/api/v1/admin/chat",
    params(
        ("session_id" = Option<String>, Query, description = "Optional session ID to delete all messages from"),
        ("message_id" = Option<String>, Query, description = "Optional specific message ID to delete"),
        ("from_date" = Option<String>, Query, description = "Optional start date (ISO format) to delete messages"),
        ("to_date" = Option<String>, Query, description = "Optional end date (ISO format) to delete messages")
    ),
    responses(
        (status = 200, description = "Messages deleted successfully", body = DeleteMessagesResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[delete("/api/v1/admin/chat")]
async fn delete_admin_chat_messages(
    query: web::Query<DeleteMessagesParams>,
    db: web::Data<Database>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    // Create a chat service instance
    let chat_service = chat_service::ChatService::new(&db);

    // Validate input parameters
    if query.session_id.is_none()
        && query.message_id.is_none()
        && (query.from_date.is_none() || query.to_date.is_none())
    {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "status": "error",
            "message": "At least one filter must be provided: session_id, message_id, or both from_date and to_date"
        }));
    }

    // Delete messages based on the provided filters
    match chat_service
        .delete_admin_messages(
            query.session_id.as_deref(),
            query.message_id.as_deref(),
            query.from_date.as_deref(),
            query.to_date.as_deref(),
        )
        .await
    {
        Ok(deleted_count) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "deleted_count": deleted_count,
            "message": format!("Successfully deleted {} messages", deleted_count)
        })),
        Err(e) => {
            debug!("Error deleting chat messages: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": "Failed to delete chat messages"
            }))
        }
    }
}

// Feature Flag Endpoints

/// Get all feature flags
#[utoipa::path(
    get,
    path = "/api/v1/admin/feature-flags",
    responses(
        (status = 200, description = "Feature flags retrieved successfully", body = FeatureFlagsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/feature-flags")]
async fn get_feature_flags(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    match admin_service::get_feature_flags(&db).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error fetching feature flags: {:?}", e);
            e.error_response()
        }
    }
}

/// Get a feature flag by key
#[utoipa::path(
    get,
    path = "/api/v1/admin/feature-flags/{key}",
    params(
        ("key" = String, Path, description = "Feature flag key"),
    ),
    responses(
        (status = 200, description = "Feature flag retrieved successfully", body = FeatureFlagResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "Feature flag not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/feature-flags/{key}")]
async fn get_feature_flag(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    let key = path.into_inner();

    match admin_service::get_feature_flag(&db, &key).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error fetching feature flag {}: {:?}", key, e);
            e.error_response()
        }
    }
}

/// Create a new feature flag
#[utoipa::path(
    post,
    path = "/api/v1/admin/feature-flags",
    request_body = CreateFeatureFlagDto,
    responses(
        (status = 201, description = "Feature flag created successfully", body = FeatureFlagResponse),
        (status = 400, description = "Invalid request data"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 409, description = "Feature flag with the same key already exists"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[post("/api/v1/admin/feature-flags")]
async fn create_feature_flag(
    db: web::Data<Database>,
    data: web::Json<CreateFeatureFlagDto>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    match admin_service::create_feature_flag(&db, data.into_inner()).await {
        Ok(response) => HttpResponse::Created().json(response),
        Err(e) => {
            log::error!("Error creating feature flag: {:?}", e);
            e.error_response()
        }
    }
}

/// Update a feature flag
#[utoipa::path(
    put,
    path = "/api/v1/admin/feature-flags/{key}",
    params(
        ("key" = String, Path, description = "Feature flag key"),
    ),
    request_body = PatchFeatureFlagDto,
    responses(
        (status = 200, description = "Feature flag updated successfully", body = FeatureFlagResponse),
        (status = 400, description = "Invalid request data"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "Feature flag not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[put("/api/v1/admin/feature-flags/{key}")]
async fn update_feature_flag(
    db: web::Data<Database>,
    path: web::Path<String>,
    data: web::Json<PatchFeatureFlagDto>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    let key = path.into_inner();

    match admin_service::update_feature_flag(&db, &key, data.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error updating feature flag {}: {:?}", key, e);
            e.error_response()
        }
    }
}

/// Delete a feature flag
#[utoipa::path(
    delete,
    path = "/api/v1/admin/feature-flags/{key}",
    params(
        ("key" = String, Path, description = "Feature flag key"),
    ),
    responses(
        (status = 204, description = "Feature flag deleted successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "Feature flag not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[delete("/api/v1/admin/feature-flags/{key}")]
async fn delete_feature_flag(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    let key = path.into_inner();

    match admin_service::delete_feature_flag(&db, &key).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Error deleting feature flag {}: {:?}", key, e);
            e.error_response()
        }
    }
}

/// Get feature flag value (client-facing API)
#[utoipa::path(
    get,
    path = "/api/v1/feature-flags/{key}",
    params(
        ("key" = String, Path, description = "Feature flag key"),
    ),
    responses(
        (status = 200, description = "Feature flag value retrieved successfully"),
        (status = 500, description = "Internal server error")
    ),
    tag = "feature-flags"
)]
#[get("/api/v1/feature-flags/{key}")]
async fn get_feature_flag_value(
    db: web::Data<Database>,
    path: web::Path<String>,
) -> impl Responder {
    let key = path.into_inner();

    match admin_service::get_feature_flag_value(&db, &key).await {
        Ok(enabled) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "data": {
                "key": key,
                "enabled": enabled
            }
        })),
        Err(e) => {
            log::error!("Error fetching feature flag value {}: {:?}", key, e);
            e.error_response()
        }
    }
}

/// Get WebSocket connection statistics
#[utoipa::path(
    get,
    path = "/api/v1/admin/websocket-stats",
    responses(
        (status = 200, description = "WebSocket statistics retrieved successfully", body = WebSocketStatsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/websocket-stats")]
async fn get_websocket_stats(
    session_manager: web::Data<Addr<SessionManager>>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    // Get stats from the session manager
    match session_manager.send(GetConnectionStats).await {
        Ok(stats) => {
            // Convert to our API response format
            let response = crate::models::admin::WebSocketStatsResponse {
                status: "success".to_string(),
                data: crate::models::admin::WebSocketStatsData {
                    stats: crate::models::admin::ConnectionStatsResponse::from(stats),
                },
            };
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            log::error!("Error fetching WebSocket stats: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": format!("Failed to get WebSocket stats: {}", e)
            }))
        }
    }
}

/// Get all login attempts with pagination for admin
#[utoipa::path(
    get,
    path = "/api/v1/admin/login-attempts",
    params(
        ("page" = Option<u64>, Query, description = "Page number starting from 1"),
        ("limit" = Option<u64>, Query, description = "Number of items per page"),
        ("username" = Option<String>, Query, description = "Filter by username"),
        ("status" = Option<bool>, Query, description = "Filter by login success status"),
    ),
    responses(
        (status = 200, description = "Successfully retrieved login attempts", body = LoginAttemptsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/api/v1/admin/login-attempts")]
async fn get_login_attempts(
    db: web::Data<Database>,
    query: web::Query<LoginAttemptsQuery>,
    req: HttpRequest,
) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    match admin_service::get_login_attempts(
        &db,
        query.page.unwrap_or(1),
        query.limit.unwrap_or(20),
        query.username.clone(),
        query.status,
    )
    .await
    {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error fetching login attempts: {:?}", e);
            e.error_response()
        }
    }
}

#[get("/api/v1/admin/debug/chat-sessions")]
async fn debug_chat_sessions(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Check if the user is an admin
    if !is_admin(&req) {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    info!("Admin checking chat sessions debug info");

    // Get sessions collection
    let sessions_coll = db.collection::<mongodb::bson::Document>("chat_sessions");

    // Count total, active, and inactive sessions
    let total = match sessions_coll.count_documents(doc! {}).await {
        Ok(count) => count,
        Err(e) => {
            log::error!("Error counting total sessions: {}", e);
            0
        }
    };

    let active = match sessions_coll.count_documents(doc! { "active": true }).await {
        Ok(count) => count,
        Err(e) => {
            log::error!("Error counting active sessions: {}", e);
            0
        }
    };

    let inactive = match sessions_coll
        .count_documents(doc! { "active": false })
        .await
    {
        Ok(count) => count,
        Err(e) => {
            log::error!("Error counting inactive sessions: {}", e);
            0
        }
    };

    // Get recent sessions
    let now = Utc::now();

    // Calculate cutoff time for recent sessions (1 hour ago)
    let one_hour_ago = now - chrono::Duration::hours(1);

    // Convert to MongoDB DateTime
    let one_hour_ago_bson = mongodb::bson::DateTime::from_millis(one_hour_ago.timestamp_millis());

    // Count recent sessions
    let recent = match sessions_coll
        .count_documents(doc! { "last_activity": { "$gt": one_hour_ago_bson } })
        .await
    {
        Ok(count) => count,
        Err(e) => {
            log::error!("Error counting recent sessions: {}", e);
            0
        }
    };

    // Get oldest session
    let mut oldest_session_info = serde_json::json!({
        "id": "none",
        "last_activity": now.to_rfc3339(),
        "minutes_ago": 0
    });

    // Use aggregation to find the oldest session
    let pipeline = vec![
        doc! { "$sort": { "last_activity": 1 } },
        doc! { "$limit": 1 },
    ];

    // Perform the aggregation
    match sessions_coll.aggregate(pipeline).await {
        Ok(mut cursor) => {
            while let Some(result) = cursor.next().await {
                match result {
                    Ok(doc) => {
                        if let (Ok(session_id), Ok(last_activity)) =
                            (doc.get_str("session_id"), doc.get_datetime("last_activity"))
                        {
                            // Convert MongoDB DateTime to seconds for calculating minutes
                            let last_activity_timestamp = last_activity.timestamp_millis() / 1000;
                            let now_timestamp = now.timestamp();
                            let seconds_ago = now_timestamp - last_activity_timestamp;
                            let minutes_ago = seconds_ago / 60;

                            oldest_session_info = serde_json::json!({
                                "id": session_id,
                                "last_activity": last_activity.to_string(),
                                "minutes_ago": minutes_ago
                            });
                        }
                    }
                    Err(e) => {
                        log::error!("Error processing document: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            log::error!("Error running aggregation: {}", e);
        }
    }

    // Prepare response
    let response = serde_json::json!({
        "status": "success",
        "data": {
            "total_sessions": total,
            "active_sessions": active,
            "inactive_sessions": inactive,
            "recent_sessions": recent,
            "current_time": now.to_rfc3339(),
            "oldest_session": oldest_session_info,
            "debug_info": "Cleanup tasks use 'last_activity' field to determine which sessions to clean up"
        }
    });

    HttpResponse::Ok().json(response)
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring admin routes");

    // Admin-only endpoints
    cfg.service(get_dashboard_stats);
    cfg.service(get_system_info);
    cfg.service(get_admin_sessions);
    cfg.service(get_admin_session_by_id);
    cfg.service(delete_admin_session);
    cfg.service(get_admin_chat_history);
    cfg.service(delete_admin_chat_messages);
    cfg.service(get_login_attempts);
    // Feature flags endpoints
    cfg.service(get_feature_flags);
    cfg.service(get_feature_flag);
    cfg.service(create_feature_flag);
    cfg.service(update_feature_flag);
    cfg.service(delete_feature_flag);
    // Client-facing feature flag endpoint - no auth required or admin role check
    cfg.service(get_feature_flag_value);
    cfg.service(get_websocket_stats);
    cfg.service(debug_chat_sessions);
}
