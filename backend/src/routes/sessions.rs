use crate::models::session::{CreateSessionDto, JoinSessionDto, RateSessionDto, SubmitResultDto};
use crate::services::session_service;
use crate::utils::jwt;
use actix_web::{delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use mongodb::Database;

/// Get all sessions with optional status filter
#[utoipa::path(
    get,
    path = "/api/v1/sessions",
    params(
        ("status" = Option<String>, Query, description = "Filter sessions by status (e.g., 'Open', 'InProgress', 'Completed')"),
        ("limit" = Option<u64>, Query, description = "Limit number of results (default: 10)"),
        ("offset" = Option<u64>, Query, description = "Offset for pagination (default: 0)")
    ),
    responses(
        (status = 200, description = "List of sessions retrieved successfully", body = Vec<SessionResponseDto>),
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
    let limit = query.get("limit").and_then(|v| v.parse::<u64>().ok());
    let offset = query.get("offset").and_then(|v| v.parse::<u64>().ok());

    match session_service::get_sessions(&db, status, limit, offset).await {
        Ok(sessions) => HttpResponse::Ok().json(sessions),
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
    let extensions = req.extensions();
    let claims = extensions.get::<jwt::Claims>().unwrap();
    let user_id = claims.sub.clone();

    // Create a new session with the authenticated user as host
    let mut session_data = session_data.into_inner();
    session_data.host_id = user_id;

    match session_service::create_session(&db, session_data).await {
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
    
    let extensions = req.extensions();
    let claims = extensions.get::<jwt::Claims>().unwrap();
    let user_id = claims.sub.clone();
        
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

    // Extract the user ID from the authentication token
    let extensions = req.extensions();
    let claims = extensions.get::<jwt::Claims>().unwrap();
    let user_id = claims.sub.clone();
            

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
    
    let extensions = req.extensions();
    let claims = extensions.get::<jwt::Claims>().unwrap();
    let user_id = claims.sub.clone();
            

    match session_service::cancel_session(&db, &id, &user_id).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
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
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
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

    let extensions = req.extensions();
    let claims = extensions.get::<jwt::Claims>().unwrap();
    let user_id = claims.sub.clone();

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

/// Rate a session
#[utoipa::path(
    post,
    path = "/api/v1/sessions/{id}/rate",
    params(
        ("id" = String, Path, description = "Session ID to rate")
    ),
    request_body = RateSessionDto,
    responses(
        (status = 200, description = "Session rated successfully"),
        (status = 400, description = "Invalid rating or cannot rate (session not completed)"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Only participants can rate the session"),
        (status = 404, description = "Session not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "sessions"
)]
#[post("/api/v1/sessions/{id}/rate")]
async fn rate_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    rating_data: web::Json<RateSessionDto>,
    req: HttpRequest,
) -> impl Responder {
    let id = path.into_inner();

    let extensions = req.extensions();
    let claims = extensions.get::<jwt::Claims>().unwrap();
    let user_id = claims.sub.clone();

    // Update rating data with user ID
    let mut rating_data = rating_data.into_inner();
    rating_data.user_id = Some(user_id);

    match session_service::rate_session(&db, &id, rating_data).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Session rated successfully"
        })),
        Err(e) => {
            log::error!("Error rating session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

#[get("/api/v1/sessions/test")]
async fn test_session_route() -> impl Responder {
    HttpResponse::Ok().body("Sessions route test working!")
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring sessions routes");
    // Public route (no auth needed)
    cfg.service(test_session_route);
    cfg.service(get_sessions);
    cfg.service(create_session);
    cfg.service(get_session);
    cfg.service(join_session);
    cfg.service(start_session);
    cfg.service(cancel_session);
    cfg.service(submit_result);
    cfg.service(get_results);
    cfg.service(rate_session);
}
