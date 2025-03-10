use crate::models::user::{CreateUserDto, LoginUserDto, UserResponse};
use crate::services::user_service;
use actix_web::{get, post, web, HttpRequest, HttpResponse, Responder};
use mongodb::Database;
use utoipa::{IntoParams, ToSchema};

/// Response for authentication endpoints
#[derive(serde::Serialize, ToSchema)]
pub struct AuthResponse {
    status: String,
    token: String,
}

/// Create a new user
#[utoipa::path(
    post,
    path = "/api/v1/users",
    request_body = CreateUserDto,
    responses(
        (status = 201, description = "User created successfully", body = UserResponse),
        (status = 400, description = "Invalid input"),
        (status = 500, description = "Internal server error")
    ),
    tag = "users"
)]
#[post("/api/v1/users")]
async fn create_user(
    db: web::Data<Database>,
    user_data: web::Json<CreateUserDto>,
) -> impl Responder {
    match user_service::create_user(&db, user_data.into_inner()).await {
        Ok(user) => HttpResponse::Created().json(user),
        Err(e) => {
            log::error!("Error creating user: {:?}", e);
            // Check if the error message contains information about missing fields
            let error_msg = e.to_string();
            if error_msg.contains("missing field") || error_msg.contains("BsonDeserialization") {
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "status": "error",
                    "message": format!("Validation error: {}", error_msg)
                }));
            }
            // For other errors, return 500
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
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
        Ok(token) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "token": token
        })),
        Err(e) => {
            log::error!("Login error: {:?}", e);
            HttpResponse::Unauthorized().json(serde_json::json!({
                "status": "error",
                "message": "Invalid credentials"
            }))
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
    // This is a placeholder - you'll need to implement proper token extraction
    let user_id = match extract_user_id_from_token(&req) {
        Some(id) => id,
        None => {
            return HttpResponse::Unauthorized().json(serde_json::json!({
                "status": "error",
                "message": "Unauthorized"
            }));
        }
    };

    // Get the user from the database
    match user_service::get_user_by_id(&db, &user_id).await {
        Ok(user) => HttpResponse::Ok().json(user),
        Err(e) => {
            log::error!("Error fetching user: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

// Helper function to extract user ID from token
// This is a placeholder - implement your actual token validation logic
fn extract_user_id_from_token(req: &HttpRequest) -> Option<String> {
    // Get the Authorization header
    let auth_header = req.headers().get("Authorization")?;
    let auth_str = auth_header.to_str().ok()?;

    // Check if it's a Bearer token
    if !auth_str.starts_with("Bearer ") {
        return None;
    }

    // Extract the token
    let token = auth_str.trim_start_matches("Bearer ").trim();

    // Here you would validate the token and extract the user ID
    // For now, we'll just return a placeholder
    // In a real implementation, you would decode the JWT and extract the user ID

    // Placeholder implementation - replace with actual JWT validation
    user_service::validate_token(token).ok()
}

pub fn config(cfg: &mut web::ServiceConfig) {
    // Register each service directly with full paths
    cfg.service(create_user)
        .service(login)
        .service(get_current_user);
}
