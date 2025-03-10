use crate::middleware::auth::RequireRole;
use crate::models::user::{CreateUserDto, LoginUserDto, UserResponse};
use crate::services::user_service;
use crate::utils::jwt;
use actix_web::{get, post, web, HttpMessage, HttpRequest, HttpResponse, Responder, ResponseError};
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

pub fn config(cfg: &mut web::ServiceConfig) {
    // Public endpoints (no authentication required)
    cfg.service(create_user)
       .service(login);
       
    // User endpoints (require user authentication)
    cfg.service(get_current_user);
    
    // Admin endpoints (require admin role)
    cfg.service(
        web::scope("/api/v1/admin")
            .wrap(RequireRole::admin())  // Apply admin role middleware
            .service(create_admin_user)  // This service now has a relative path
            // Add other admin endpoints here
    );
}