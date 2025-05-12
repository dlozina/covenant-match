use crate::models::error::AppError;
use crate::models::friends::CreateFriendRequestDto;
use crate::models::{common::PaginationQuery, friends::CheckFriendStatusDto};
use crate::services::friends_service;
use crate::utils::jwt;
use actix_web::{delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use mongodb::Database;

/// Send a friend request
#[utoipa::path(
    post,
    path = "/api/v1/friend-requests",
    request_body = CreateFriendRequestDto,
    responses(
        (status = 201, description = "Friend request sent successfully", body = FriendRequestResponse),
        (status = 400, description = "Invalid request or user not found"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[post("/api/v1/friend-requests")]
async fn send_friend_request(
    db: web::Data<Database>,
    req: HttpRequest,
    request_data: web::Json<CreateFriendRequestDto>,
) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    let receiver_id = &request_data.receiver_id;

    match friends_service::send_friend_request(&db, &user_id, receiver_id).await {
        Ok(response) => HttpResponse::Created().json(response),
        Err(e) => {
            log::error!("Error sending friend request: {:?}", e);
            match e {
                AppError::UserNotFound => HttpResponse::BadRequest().json(serde_json::json!({
                    "status": "error",
                    "message": "User not found"
                })),
                AppError::FriendshipAlreadyExists => {
                    HttpResponse::BadRequest().json(serde_json::json!({
                        "status": "error",
                        "message": "Friendship already exists"
                    }))
                }
                AppError::FriendRequestAlreadyExists => {
                    HttpResponse::BadRequest().json(serde_json::json!({
                        "status": "error",
                        "message": "Friend request already exists"
                    }))
                }
                AppError::InvalidFriendRequest(msg) => {
                    HttpResponse::BadRequest().json(serde_json::json!({
                        "status": "error",
                        "message": msg
                    }))
                }
                _ => HttpResponse::InternalServerError().json(serde_json::json!({
                    "status": "error",
                    "message": "Internal server error"
                })),
            }
        }
    }
}

/// Get all incoming/outgoing friend requests
#[utoipa::path(
    get,
    path = "/api/v1/friend-requests",
    responses(
        (status = 200, description = "Friend requests retrieved successfully", body = FriendRequestsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[get("/api/v1/friend-requests")]
async fn get_friend_requests(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match friends_service::get_friend_requests(&db, &user_id).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error getting friend requests: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": "Failed to retrieve friend requests"
            }))
        }
    }
}

/// Accept a friend request
#[utoipa::path(
    put,
    path = "/api/v1/friend-requests/{id}/accept",
    params(
        ("id" = String, Path, description = "Friend request ID to accept")
    ),
    responses(
        (status = 200, description = "Friend request accepted successfully", body = FriendRequestResponse),
        (status = 400, description = "Invalid request or request not found"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Not allowed to accept this request"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[put("/api/v1/friend-requests/{id}/accept")]
async fn accept_friend_request(
    db: web::Data<Database>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    let request_id = path.into_inner();

    match friends_service::accept_friend_request(&db, &request_id, &user_id).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error accepting friend request: {:?}", e);
            match e {
                AppError::RequestNotFound => HttpResponse::BadRequest().json(serde_json::json!({
                    "status": "error",
                    "message": "Friend request not found or already processed"
                })),
                _ => HttpResponse::InternalServerError().json(serde_json::json!({
                    "status": "error",
                    "message": "Failed to accept friend request"
                })),
            }
        }
    }
}

/// Reject a friend request
#[utoipa::path(
    put,
    path = "/api/v1/friend-requests/{id}/reject",
    params(
        ("id" = String, Path, description = "Friend request ID to reject")
    ),
    responses(
        (status = 200, description = "Friend request rejected successfully", body = FriendRequestResponse),
        (status = 400, description = "Invalid request or request not found"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Not allowed to reject this request"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[put("/api/v1/friend-requests/{id}/reject")]
async fn reject_friend_request(
    db: web::Data<Database>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    let request_id = path.into_inner();

    match friends_service::reject_friend_request(&db, &request_id, &user_id).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error rejecting friend request: {:?}", e);
            match e {
                AppError::RequestNotFound => HttpResponse::BadRequest().json(serde_json::json!({
                    "status": "error",
                    "message": "Friend request not found or already processed"
                })),
                _ => HttpResponse::InternalServerError().json(serde_json::json!({
                    "status": "error",
                    "message": "Failed to reject friend request"
                })),
            }
        }
    }
}

/// Get all friends
#[utoipa::path(
    get,
    path = "/api/v1/friends",
    params(
        ("page" = Option<u64>, Query, description = "Page number (default: 1)"),
        ("limit" = Option<u64>, Query, description = "Number of items per page (default: 10)")
    ),
    responses(
        (status = 200, description = "Friends retrieved successfully", body = PaginatedFriendsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[get("/api/v1/friends")]
async fn get_friends(
    db: web::Data<Database>,
    req: HttpRequest,
    query: web::Query<PaginationQuery>,
) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Set default pagination values
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(10);

    match friends_service::get_friends_paginated(&db, &user_id, page, limit).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error getting friends: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": "Failed to retrieve friends"
            }))
        }
    }
}

/// Remove a friend
#[utoipa::path(
    delete,
    path = "/api/v1/friends/{id}",
    params(
        ("id" = String, Path, description = "Friend ID to remove")
    ),
    responses(
        (status = 200, description = "Friend removed successfully"),
        (status = 400, description = "Invalid friend ID"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[delete("/api/v1/friends/{id}")]
async fn remove_friend(
    db: web::Data<Database>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    let friend_id = path.into_inner();

    match friends_service::remove_friend(&db, &user_id, &friend_id).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Friend removed successfully"
        })),
        Err(e) => {
            log::error!("Error removing friend: {:?}", e);
            match e {
                AppError::InvalidId => HttpResponse::BadRequest().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid friend ID"
                })),
                _ => HttpResponse::InternalServerError().json(serde_json::json!({
                    "status": "error",
                    "message": "Failed to remove friend"
                })),
            }
        }
    }
}

/// Get incoming friend requests with pagination
#[utoipa::path(
    get,
    path = "/api/v1/friend-requests/incoming",
    params(
        ("page" = Option<u64>, Query, description = "Page number (default: 1)"),
        ("limit" = Option<u64>, Query, description = "Number of items per page (default: 10)")
    ),
    responses(
        (status = 200, description = "Incoming friend requests retrieved successfully", body = PaginatedFriendRequestsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[get("/api/v1/friend-requests/incoming")]
async fn get_incoming_friend_requests(
    db: web::Data<Database>,
    req: HttpRequest,
    query: web::Query<PaginationQuery>,
) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Set default pagination values
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(10);

    match friends_service::get_incoming_friend_requests(&db, &user_id, page, limit).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error getting incoming friend requests: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": "Failed to retrieve incoming friend requests"
            }))
        }
    }
}

/// Get outgoing friend requests with pagination
#[utoipa::path(
    get,
    path = "/api/v1/friend-requests/outgoing",
    params(
        ("page" = Option<u64>, Query, description = "Page number (default: 1)"),
        ("limit" = Option<u64>, Query, description = "Number of items per page (default: 10)")
    ),
    responses(
        (status = 200, description = "Outgoing friend requests retrieved successfully", body = PaginatedFriendRequestsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[get("/api/v1/friend-requests/outgoing")]
async fn get_outgoing_friend_requests(
    db: web::Data<Database>,
    req: HttpRequest,
    query: web::Query<PaginationQuery>,
) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Set default pagination values
    let page = query.page.unwrap_or(1);
    let limit = query.limit.unwrap_or(10);

    match friends_service::get_outgoing_friend_requests(&db, &user_id, page, limit).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error getting outgoing friend requests: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": "Failed to retrieve outgoing friend requests"
            }))
        }
    }
}

/// Check if user has any pending incoming friend requests
#[utoipa::path(
    get,
    path = "/api/v1/friend-requests/has-pending",
    responses(
        (status = 200, description = "Check completed successfully", body = HasPendingFriendRequestsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[get("/api/v1/friend-requests/has-pending")]
async fn has_pending_friend_requests(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match friends_service::has_pending_friend_requests(&db, &user_id).await {
        Ok(has_pending) => HttpResponse::Ok().json(has_pending),
        Err(e) => {
            log::error!("Error checking pending friend requests: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": "Failed to check pending friend requests"
            }))
        }
    }
}

/// Check friend status for multiple users
#[utoipa::path(
    post,
    path = "/api/v1/friends/check-status",
    request_body = CheckFriendStatusDto,
    responses(
        (status = 200, description = "Friend status checked successfully", body = FriendStatusResponse),
        (status = 400, description = "Invalid request"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "friends"
)]
#[post("/api/v1/friends/check-status")]
async fn check_friend_status(
    db: web::Data<Database>,
    req: HttpRequest,
    request_data: web::Json<CheckFriendStatusDto>,
) -> impl Responder {
    // Extract user_id from JWT token
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    match friends_service::check_friend_status(&db, &user_id, &request_data.user_ids).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            log::error!("Error checking friend status: {:?}", e);
            match e {
                AppError::InvalidId => HttpResponse::BadRequest().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid user ID format"
                })),
                _ => HttpResponse::InternalServerError().json(serde_json::json!({
                    "status": "error",
                    "message": "Failed to check friend status"
                })),
            }
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(send_friend_request)
        .service(get_friend_requests)
        .service(get_incoming_friend_requests)
        .service(get_outgoing_friend_requests)
        .service(accept_friend_request)
        .service(reject_friend_request)
        .service(get_friends)
        .service(remove_friend)
        .service(has_pending_friend_requests)
        .service(check_friend_status);
}
