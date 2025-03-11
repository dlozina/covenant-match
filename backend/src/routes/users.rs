use crate::middleware::auth::RequireRole;
use crate::models::error::AppError;
use crate::models::user::{
    CreateUserDto, GetUsersQuery, LoginUserDto, UpdateUserProfileDto, UserResponse,
};
use crate::services::user_service;
use crate::utils::jwt;
use actix_web::{
    delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder, ResponseError,
};
use mongodb::Database;
use utoipa::{IntoParams, ToSchema};

/// Create a new user
#[utoipa::path(
    post,
    path = "/api/v1/users",
    request_body = CreateUserDto,
    responses(
        (status = 201, description = "User created successfully", body = UserResponse),
        (status = 400, description = "Invalid input"),
        (status = 409, description = "User already exists"),
        (status = 500, description = "Internal server error")
    ),
    tag = "users"
)]
#[post("/api/v1/users")]
async fn create_user(
    db: web::Data<Database>,
    user_data: web::Json<CreateUserDto>,
    req: HttpRequest,
) -> impl Responder {
    // Check if request has authentication (for role check)
    let requesting_user_role = if let Some(auth_header) = req.headers().get("Authorization") {
        let auth_str = auth_header.to_str().unwrap_or("");
        if auth_str.starts_with("Bearer ") {
            let token = auth_str.trim_start_matches("Bearer ");
            jwt::get_role_from_token(token).ok()
        } else {
            None
        }
    } else {
        None
    };

    // Pass the requesting user's role (if any) to determine if they can create an admin
    match user_service::create_user(&db, user_data.into_inner(), requesting_user_role.as_deref())
        .await
    {
        Ok(user) => HttpResponse::Created().json(user),
        Err(e) => {
            log::error!("Error creating user: {:?}", e);
            e.error_response()
        }
    }
}

/// Login a user
#[utoipa::path(
    post,
    path = "/api/v1/auth/login",
    request_body = LoginUserDto,
    responses(
        (status = 200, description = "Login successful", body = AuthResponse),
        (status = 401, description = "Invalid credentials"),
        (status = 500, description = "Internal server error")
    ),
    tag = "users"
)]
#[post("/api/v1/auth/login")]
async fn login(db: web::Data<Database>, credentials: web::Json<LoginUserDto>) -> impl Responder {
    match user_service::login_user(&db, credentials.into_inner()).await {
        Ok((token, user)) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "token": token,
            "user": user
        })),
        Err(e) => {
            log::error!("Login error: {:?}", e);
            e.error_response()
        }
    }
}

/// Get current user profile
#[utoipa::path(
    get,
    path = "/api/v1/users/me",
    responses(
        (status = 200, description = "User profile retrieved successfully", body = UserResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users"
)]
#[get("/api/v1/users/me")]
async fn get_current_user(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Extract the user ID from the authentication token
    let auth_header = req.headers().get("Authorization");
    let user_id = match auth_header {
        Some(header) => {
            let auth_str = header.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                let token = auth_str.trim_start_matches("Bearer ");
                match jwt::get_user_id_from_token(token) {
                    Ok(id) => id,
                    Err(e) => return e.error_response(),
                }
            } else {
                return HttpResponse::Unauthorized().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid authorization header format"
                }));
            }
        }
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "status": "error",
                "message": "Authentication required"
            }));
        }
    };

    // Get the user from the database
    match user_service::get_user_by_id(&db, &user_id).await {
        Ok(user) => HttpResponse::Ok().json(user),
        Err(e) => {
            log::error!("Error fetching user: {:?}", e);
            e.error_response()
        }
    }
}

/// Update current user profile
#[utoipa::path(
    put,
    path = "/api/v1/users/me",
    request_body = UpdateUserProfileDto,
    responses(
        (status = 200, description = "Profile updated successfully", body = UserResponse),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User not found"),
        (status = 409, description = "Email already in use"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users"
)]
#[put("/api/v1/users/me")]
async fn update_profile(
    db: web::Data<Database>,
    req: HttpRequest,
    update_data: web::Json<UpdateUserProfileDto>,
) -> impl Responder {
    // Extract the user ID from the authentication token
    let auth_header = req.headers().get("Authorization");
    let user_id = match auth_header {
        Some(header) => {
            let auth_str = header.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                let token = auth_str.trim_start_matches("Bearer ");
                match jwt::get_user_id_from_token(token) {
                    Ok(id) => id,
                    Err(e) => return e.error_response(),
                }
            } else {
                return HttpResponse::Unauthorized().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid authorization header format"
                }));
            }
        }
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "status": "error",
                "message": "Authentication required"
            }));
        }
    };

    // Update the user profile
    match user_service::update_user_profile(&db, &user_id, update_data.into_inner()).await {
        Ok(user) => HttpResponse::Ok().json(user),
        Err(e) => {
            log::error!("Error updating user profile: {:?}", e);
            e.error_response()
        }
    }
}

/// Delete current user
#[utoipa::path(
    delete,
    path = "/api/v1/users/me",
    responses(
        (status = 204, description = "User deleted successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users"
)]
#[delete("/api/v1/users/me")]
async fn delete_user(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Extract the user ID from the authentication token
    let auth_header = req.headers().get("Authorization");
    let user_id = match auth_header {
        Some(header) => {
            let auth_str = header.to_str().unwrap_or("");
            if auth_str.starts_with("Bearer ") {
                let token = auth_str.trim_start_matches("Bearer ");
                match jwt::get_user_id_from_token(token) {
                    Ok(id) => id,
                    Err(e) => return e.error_response(),
                }
            } else {
                return HttpResponse::Unauthorized().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid authorization header format"
                }));
            }
        }
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "status": "error",
                "message": "Authentication required"
            }));
        }
    };

    // Delete the user
    match user_service::delete_user(&db, &user_id).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Error deleting user: {:?}", e);
            e.error_response()
        }
    }
}

/// Create a new admin user (admin only)
#[utoipa::path(
    post,
    path = "/api/v1/admin/users",
    request_body = CreateUserDto,
    responses(
        (status = 201, description = "Admin user created successfully", body = UserResponse),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 409, description = "User already exists"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
// Changed path to be relative to the scope ("/users" instead of "/api/v1/admin/users")
#[post("/users")]
async fn create_admin_user(
    db: web::Data<Database>,
    user_data: web::Json<CreateUserDto>,
    req: HttpRequest,
) -> impl Responder {
    // Extract claims from the request extensions (set by middleware)
    let claims = match req.extensions().get::<jwt::Claims>() {
        Some(claims) if claims.role == "admin" => claims,
        Some(_) => {
            return HttpResponse::Forbidden().json(serde_json::json!({
                "status": "error",
                "message": "Admin role required"
            }));
        }
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "status": "error",
                "message": "Authentication required"
            }));
        }
    };

    // Create a new user with admin role
    let mut admin_user_data = user_data.into_inner();
    admin_user_data.role = Some("admin".to_string());

    match user_service::create_user(&db, admin_user_data, Some("admin")).await {
        Ok(user) => HttpResponse::Created().json(user),
        Err(e) => {
            log::error!("Error creating admin user: {:?}", e);
            e.error_response()
        }
    }
}

/// Get all users with pagination (admin only)
#[utoipa::path(
    get,
    path = "/api/v1/admin/users",
    params(
        ("role" = Option<String>, Query, description = "Filter users by role (e.g., 'user' or 'admin')"),
        ("page" = Option<u64>, Query, description = "Page number (default: 1)"),
        ("limit" = Option<u64>, Query, description = "Items per page (default: 10)")
    ),
    responses(
        (status = 200, description = "List of users retrieved successfully", body = UsersListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/users")]
async fn get_all_users(
    db: web::Data<Database>,
    req: HttpRequest,
    query: web::Query<GetUsersQuery>,
) -> impl Responder {
    // The middleware already checks for admin role, but we can double-check here
    if let Some(claims) = req.extensions().get::<jwt::Claims>() {
        if claims.role != "admin" {
            return HttpResponse::Forbidden().json(serde_json::json!({
                "status": "error",
                "message": "Admin role required"
            }));
        }
    } else {
        return HttpResponse::Unauthorized().json(serde_json::json!({
            "status": "error",
            "message": "Authentication required"
        }));
    }

    // Get paginated users
    match user_service::get_users_paginated(&db, query.role.as_deref(), query.page, query.limit)
        .await
    {
        Ok((users, total, page)) => {
            let total_pages = (total as f64 / query.limit as f64).ceil() as u64;

            HttpResponse::Ok().json(serde_json::json!({
                "status": "success",
                "data": {
                    "users": users,
                    "pagination": {
                        "total": total,
                        "page": page,
                        "limit": query.limit,
                        "total_pages": total_pages
                    }
                }
            }))
        }
        Err(e) => {
            log::error!("Error fetching users: {:?}", e);
            e.error_response()
        }
    }
}

/// Get a specific user by ID (admin only)
#[utoipa::path(
    get,
    path = "/api/v1/admin/users/{user_id}",
    params(
        ("user_id" = String, Path, description = "User ID to retrieve")
    ),
    responses(
        (status = 200, description = "User retrieved successfully", body = UserResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[get("/users/{user_id}")]
async fn get_user_by_id_admin(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // The middleware already checks for admin role
    let user_id = path.into_inner();

    match user_service::get_user_by_id(&db, &user_id).await {
        Ok(user) => HttpResponse::Ok().json(user),
        Err(e) => {
            log::error!("Error fetching user: {:?}", e);
            e.error_response()
        }
    }
}

/// Update a specific user by ID (admin only)
#[utoipa::path(
    put,
    path = "/api/v1/admin/users/{user_id}",
    params(
        ("user_id" = String, Path, description = "User ID to update")
    ),
    request_body = UpdateUserProfileDto,
    responses(
        (status = 200, description = "User updated successfully", body = UserResponse),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "User not found"),
        (status = 409, description = "Email or display name already in use"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[put("/users/{user_id}")]
async fn update_user_admin(
    db: web::Data<Database>,
    path: web::Path<String>,
    update_data: web::Json<UpdateUserProfileDto>,
    req: HttpRequest,
) -> impl Responder {
    // The middleware already checks for admin role
    let user_id = path.into_inner();

    match user_service::update_user_profile(&db, &user_id, update_data.into_inner()).await {
        Ok(user) => HttpResponse::Ok().json(user),
        Err(e) => {
            log::error!("Error updating user: {:?}", e);
            e.error_response()
        }
    }
}

/// Delete a specific user by ID (admin only)
#[utoipa::path(
    delete,
    path = "/api/v1/admin/users/{user_id}",
    params(
        ("user_id" = String, Path, description = "User ID to delete")
    ),
    responses(
        (status = 204, description = "User deleted successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[delete("/users/{user_id}")]
async fn delete_user_admin(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> impl Responder {
    // The middleware already checks for admin role
    let user_id = path.into_inner();

    match user_service::delete_user(&db, &user_id).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Error deleting user: {:?}", e);
            e.error_response()
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    // Public endpoints (no authentication required)
    cfg.service(create_user).service(login);

    // User endpoints (require user authentication)
    cfg.service(get_current_user)
        .service(update_profile)
        .service(delete_user);

    // Admin endpoints (require admin role)
    cfg.service(
        web::scope("/api/v1/admin")
            .wrap(RequireRole::admin()) // Apply admin role middleware
            .service(create_admin_user)
            .service(get_all_users)
            .service(get_user_by_id_admin)
            .service(update_user_admin)
            .service(delete_user_admin),
    );
}
