use crate::models::error::AppError;
use crate::models::session::{CreateSessionDto, JoinSessionDto, SubmitResultDto, UpdateSessionDto};
use crate::services::session_service;
use crate::utils::jwt;
use actix_web::{
    get, patch, post, web, HttpMessage, HttpRequest, HttpResponse, Responder, ResponseError,
};
use mongodb::Database;

/// Get all sessions with optional status filter
#[utoipa::path(
    get,
    path = "/api/v1/sessions",
    params(
        ("status" = Option<String>, Query, description = "Filter sessions by status (e.g., 'Open', 'InProgress', 'Completed')"),
        ("limit" = Option<u64>, Query, description = "Limit number of results (default: 10)"),
        ("offset" = Option<u64>, Query, description = "Offset for pagination (default: 0)"),
        ("isPrivate" = Option<bool>, Query, description = "Filter sessions by private status (default: false)"),
        ("region" = Option<String>, Query, description = "Filter sessions by player region"),
        ("platform" = Option<String>, Query, description = "Filter sessions by player platform"),
        ("nightLord" = Option<String>, Query, description = "Filter sessions by night lord"),
        ("hostExperience" = Option<String>, Query, description = "Filter sessions by host experience")
    ),
    responses(
        (status = 200, description = "List of sessions retrieved successfully", body = PaginatedSessionsResponse<SessionResponseDto>),
        (status = 500, description = "Internal server error")
    ),
    tag = "sessions"
)]
#[get("/api/v1/sessions")]
async fn get_sessions(
    db: web::Data<Database>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let status = query.get("status").cloned();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(10);
    let offset = query
        .get("offset")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(0);
    let is_private = query.get("isPrivate").and_then(|v| v.parse::<bool>().ok());
    let region = query.get("region").cloned();
    let platform = query.get("platform").cloned();

    // Add new filter parameters
    let night_lord = query.get("nightLord").cloned();
    let host_experience = query.get("hostExperience").cloned();

    match session_service::get_sessions_with_pagination(
        &db,
        status,
        Some(limit),
        Some(offset),
        is_private,
        region,
        platform,
        night_lord,
        host_experience,
    )
    .await
    {
        Ok(pagination_response) => HttpResponse::Ok().json(pagination_response),
        Err(e) => {
            log::error!("Error fetching sessions: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Create a new game session
#[utoipa::path(
    post,
    path = "/api/v1/sessions",
    request_body = CreateSessionDto,
    responses(
        (status = 201, description = "Session created successfully", body = SessionResponseDto),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions")]
async fn create_session(
    db: web::Data<Database>,
    session_data: web::Json<CreateSessionDto>,
    req: HttpRequest,
) -> impl Responder {
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Create a new session with the authenticated user as host
    let session_data = session_data.into_inner();

    match session_service::create_session(&db, &user_id, session_data).await {
        Ok(session) => HttpResponse::Created().json(session),
        Err(e) => {
            log::error!("Error creating session: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get details of a specific session
#[utoipa::path(
    get,
    path = "/api/v1/sessions/{id}",
    params(
        ("id" = String, Path, description = "Session ID to retrieve")
    ),
    responses(
        (status = 200, description = "Session retrieved successfully", body = SessionResponseDto),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "sessions"
)]
#[get("/api/v1/sessions/{id}")]
async fn get_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::get_session_by_id(&db, &id, Some(&user_id)).await {
        Ok(Some(session)) => HttpResponse::Ok().json(session),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "status": "error",
            "message": "Session not found"
        })),
        Err(e) => {
            log::error!("Error fetching session: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Join an existing session
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/join",
    params(
        ("id" = String, Path, description = "Session ID to join")
    ),
    request_body = JoinSessionDto,
    responses(
        (status = 200, description = "Joined session successfully", body = SessionResponseDto),
        (status = 400, description = "Cannot join session (full or already started)"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/join")]
async fn join_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    join_data: web::Json<JoinSessionDto>,
) -> impl Responder {
    let id = path.into_inner();

    let join_data = join_data.into_inner();

    match session_service::join_session(&db, &id, join_data).await {
        Ok(session) => HttpResponse::Ok().json(session),
        Err(e) => {
            log::error!("Error joining session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Start a game session
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/start",
    params(
        ("id" = String, Path, description = "Session ID to start")
    ),
    responses(
        (status = 200, description = "Session started successfully", body = SessionResponseDto),
        (status = 400, description = "Cannot start session (not enough players or already started)"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only the host can start the session"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/start")]
async fn start_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::start_session(&db, &id, &user_id).await {
        Ok(session) => HttpResponse::Ok().json(session),
        Err(e) => {
            log::error!("Error starting session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Cancel a session (host only)
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/cancel",
    params(
        ("id" = String, Path, description = "Session ID to cancel")
    ),
    responses(
        (status = 200, description = "Session cancelled successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only the host can cancel the session"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/cancel")]
async fn cancel_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::cancel_session(&db, &id, &user_id).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Session cancelled successfully"
        })),
        Err(e) => {
            log::error!("Error cancelling session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Leave a session (joined player only, before session starts, after it's completed or cancelled)
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/leave",
    params(
        ("id" = String, Path, description = "Session ID to leave")
    ),
    responses(
        (status = 200, description = "Left session successfully"),
        (status = 400, description = "Cannot leave session (already started or not a member)"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/leave")]
async fn leave_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::leave_session(&db, &id, &user_id).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Left session successfully"
        })),
        Err(e) => {
            log::error!("Error leaving session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Complete a session (host only)
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/complete",
    params(
        ("id" = String, Path, description = "Session ID to complete")
    ),
    responses(
        (status = 200, description = "Session completed successfully", body = SessionResponseDto),
        (status = 400, description = "Cannot complete session (not in progress)"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only the host can complete the session"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/complete")]
async fn complete_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
    body: Option<web::Json<serde_json::Value>>,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Extract duration from request body if provided
    let duration = body.and_then(|b| b.get("duration").and_then(serde_json::Value::as_i64));

    match session_service::complete_session(&db, &id, &user_id, duration).await {
        Ok(session) => HttpResponse::Ok().json(session),
        Err(e) => {
            log::error!("Error completing session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Recreate a session with the same team (host only)
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/recreate",
    params(
        ("id" = String, Path, description = "Original session ID to recreate")
    ),
    responses(
        (status = 201, description = "New session created successfully with the same team", body = SessionResponseDto),
        (status = 400, description = "Cannot recreate session (not completed)"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only the host can recreate the session"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/recreate")]
async fn recreate_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::recreate_session(&db, &id, &user_id, true).await {
        Ok(session) => HttpResponse::Created().json(session),
        Err(e) => {
            log::error!("Error recreating session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Update session characters (host only)
#[utoipa::path(
    patch,
    path = "/api/v1/sessions/{id}",
    params(
        ("id" = String, Path, description = "Session ID to update")
    ),
    request_body = UpdateSessionDto,
    responses(
        (status = 200, description = "Session updated successfully", body = SessionResponseDto),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only the host can update the session"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[patch("/api/v1/sessions/{id}")]
async fn update_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    update_data: web::Json<UpdateSessionDto>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::update_session(&db, &id, &user_id, update_data.into_inner()).await {
        Ok(session) => HttpResponse::Ok().json(session),
        Err(e) => {
            log::error!("Error updating session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Submit game result
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/results",
    params(
        ("id" = String, Path, description = "Session ID to submit result for")
    ),
    request_body = SubmitResultDto,
    responses(
        (status = 200, description = "Result submitted successfully"),
        (status = 400, description = "Invalid result or cannot submit (session not in progress)"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only participants can submit results"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/results")]
async fn submit_result(
    db: web::Data<Database>,
    path: web::Path<String>,
    result_data: web::Json<SubmitResultDto>,
) -> impl Responder {
    let id = path.into_inner();

    let result_data = result_data.into_inner();

    match session_service::submit_result(&db, &id, result_data).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Result submitted successfully"
        })),
        Err(e) => {
            log::error!("Error submitting result: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get session results
#[utoipa::path(
    get,
    path = "/api/v1/sessions/{id}/results",
    params(
        ("id" = String, Path, description = "Session ID to get results for")
    ),
    responses(
        (status = 200, description = "Results retrieved successfully", body = ResultsResponseDto),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only participants can view results"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[get("/api/v1/sessions/{id}/results")]
async fn get_results(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::get_session_results(&db, &id, &user_id).await {
        Ok(results) => HttpResponse::Ok().json(results),
        Err(e) => {
            log::error!("Error fetching results: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get minimal public sessions with optional status filter (no authentication required)
#[utoipa::path(
    get,
    path = "/api/v1/public/sessions",
    params(
        ("status" = Option<String>, Query, description = "Filter sessions by status (e.g., 'Open', 'InProgress', 'Completed')"),
        ("limit" = Option<u64>, Query, description = "Limit number of results (default: 10)"),
        ("offset" = Option<u64>, Query, description = "Offset for pagination (default: 0)"),
        ("region" = Option<String>, Query, description = "Filter sessions by player region"),
        ("platform" = Option<String>, Query, description = "Filter sessions by player platform")
    ),
    responses(
        (status = 200, description = "List of minimal session information retrieved successfully", body = Vec<MinimalSessionDto>),
        (status = 500, description = "Internal server error")
    ),
    tag = "sessions"
)]
#[get("/api/v1/public/sessions")]
async fn get_public_sessions(
    db: web::Data<Database>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let status = query.get("status").cloned();
    let limit = query
        .get("limit")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(10);
    let offset = query
        .get("offset")
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(0);
    let region = query.get("region").cloned();
    let platform = query.get("platform").cloned();

    // Add new filter parameters
    let night_lord = query.get("nightLord").cloned();
    let host_experience = query.get("hostExperience").cloned();

    // Calculate page number from offset and limit (1-indexed for response)
    let page = (offset / limit) + 1;

    match session_service::get_minimal_sessions_with_pagination(
        &db,
        status,
        Some(limit),
        Some(offset),
        region,
        platform,
        night_lord,
        host_experience,
    )
    .await
    {
        Ok(pagination_response) => HttpResponse::Ok().json(pagination_response),
        Err(e) => {
            log::error!("Error fetching public sessions: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get active session for the current user
#[utoipa::path(
    get,
    path = "/api/v1/sessions/active",
    responses(
        (status = 200, description = "User's active session information or null if none", body = Option<SessionResponseDto>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[get("/api/v1/sessions/active")]
async fn get_user_active_session(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::check_user_active_session(&db, &user_id).await {
        Ok(session) => HttpResponse::Ok().json(session),
        Err(e) => {
            log::error!("Error checking active session: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Reset the new session flags (once enough players have joined)
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/reset-flags",
    params(
        ("id" = String, Path, description = "Session ID to reset flags for")
    ),
    responses(
        (status = 200, description = "Session flags reset successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/reset-flags")]
async fn reset_session_flags(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::reset_session_flags(&db, &id, &user_id).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Session flags reset successfully"
        })),
        Err(e) => {
            log::error!("Error resetting session flags: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

/// Get sessions created by friends
#[utoipa::path(
    get,
    path = "/api/v1/sessions/friends",
    params(
        ("status" = Option<String>, Query, description = "Filter sessions by status (e.g., 'Open', 'InProgress', 'Completed')"),
        ("limit" = Option<u64>, Query, description = "Limit number of results (default: 10)"),
        ("offset" = Option<u64>, Query, description = "Offset for pagination (default: 0)"),
        ("isPrivate" = Option<bool>, Query, description = "Filter sessions by private status (default: false)"),
        ("region" = Option<String>, Query, description = "Filter sessions by player region"),
        ("platform" = Option<String>, Query, description = "Filter sessions by player platform")
    ),
    responses(
        (status = 200, description = "List of sessions created by friends retrieved successfully", body = Vec<SessionResponseDto>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[get("/api/v1/sessions/friends")]
async fn get_friends_sessions(
    db: web::Data<Database>,
    req: HttpRequest,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    // Extract claims from request extensions
    let claims = {
        let extensions = req.extensions();
        match extensions.get::<jwt::Claims>() {
            Some(claims) => claims.clone(),
            None => {
                return HttpResponse::Unauthorized().json(serde_json::json!({
                    "status": "error",
                    "message": "Authentication required"
                }));
            }
        }
    };

    // Extract query parameters
    let status = query.get("status").map(|s| s.to_string());
    let limit = query
        .get("limit")
        .and_then(|l| l.parse::<u64>().ok())
        .unwrap_or(10);
    let offset = query
        .get("offset")
        .and_then(|o| o.parse::<u64>().ok())
        .unwrap_or(0);
    let is_private = query.get("isPrivate").and_then(|p| p.parse::<bool>().ok());
    let region = query.get("region").cloned();
    let platform = query.get("platform").cloned();

    // Add new filter parameters
    let night_lord = query.get("nightLord").cloned();
    let host_experience = query.get("hostExperience").cloned();

    match session_service::get_friends_sessions_with_pagination(
        &db,
        &claims.sub,
        status,
        Some(limit),
        Some(offset),
        is_private,
        region,
        platform,
        night_lord,
        host_experience,
    )
    .await
    {
        Ok(pagination_response) => HttpResponse::Ok().json(pagination_response),
        Err(e) => {
            log::error!("Error getting friends' sessions: {:?}", e);
            e.error_response()
        }
    }
}

/// Kick a player from a session (host only)
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/kick/{playerId}",
    params(
        ("id" = String, Path, description = "Session ID"),
        ("playerId" = String, Path, description = "Player ID to kick from the session")
    ),
    responses(
        (status = 200, description = "Player kicked successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only the host can kick players"),
        (status = 404, description = "Session or player not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/kick/{playerId}")]
async fn kick_player(
    db: web::Data<Database>,
    path: web::Path<(String, String)>,
    req: HttpRequest,
) -> impl Responder {
    let (id, player_id) = path.into_inner();

    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match session_service::kick_player(&db, &id, &user_id, &player_id).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Player kicked successfully"
        })),
        Err(e) => {
            log::error!("Error kicking player: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/sessions/{id}/friendship-matrix",
    params(
        ("id" = String, Path, description = "Session ID")
    ),
    responses(
        (status = 200, description = "Friendship matrix retrieved successfully", body = FriendshipMatrix),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[get("/api/v1/sessions/{id}/friendship-matrix")]
async fn get_friendship_matrix(db: web::Data<Database>, path: web::Path<String>) -> impl Responder {
    match session_service::get_friendship_matrix(&db, &path.into_inner()).await {
        Ok(matrix) => HttpResponse::Ok().json(matrix),
        Err(e) => {
            log::error!("Error getting friendship matrix: {:?}", e);
            match e {
                AppError::SessionNotFound => HttpResponse::NotFound().json(serde_json::json!({
                    "status": "error",
                    "message": "Session not found"
                })),
                AppError::InvalidId => HttpResponse::BadRequest().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid session ID format"
                })),
                _ => HttpResponse::InternalServerError().json(serde_json::json!({
                    "status": "error",
                    "message": "Internal server error"
                })),
            }
        }
    }
}

/// Get sessions created by friends
pub fn config(cfg: &mut web::ServiceConfig) {
    // Register paths from most specific to most general
    // Global endpoints first
    cfg.service(get_public_sessions)
        // Then specific action endpoints
        .service(get_user_active_session) // /api/v1/sessions/active must be before {id} routes
        .service(get_friends_sessions) // /api/v1/sessions/friends must be before {id} routes
        .service(get_sessions)
        .service(create_session)
        // Then ID-based endpoints
        .service(get_session)
        .service(join_session)
        .service(leave_session)
        .service(start_session)
        .service(cancel_session)
        .service(complete_session)
        .service(recreate_session)
        .service(update_session)
        .service(submit_result)
        .service(get_results)
        .service(reset_session_flags)
        .service(kick_player)
        .service(get_friendship_matrix);
}
