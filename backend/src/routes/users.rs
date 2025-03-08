use crate::models::user::{CreateUserDto, LoginUserDto, UserResponse};
use crate::services::user_service;
use actix_web::{get, post, put, web, HttpResponse, Responder};
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
#[post("")]
async fn create_user(
    db: web::Data<Database>,
    user_data: web::Json<CreateUserDto>,
) -> impl Responder {
    match user_service::create_user(&db, user_data.into_inner()).await {
        Ok(user) => HttpResponse::Created().json(user),
        Err(e) => {
            log::error!("Error creating user: {:?}", e);
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
#[post("/login")]
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
#[get("/me")]
async fn get_current_user(
    db: web::Data<Database>,
    // This will be expanded with JWT middleware later
) -> impl Responder {
    // Placeholder for now
    HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Current user profile endpoint"
    }))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            .service(
                web::scope("/users")
                    .service(create_user)
                    .service(get_current_user)
            )
            .service(
                web::scope("/auth")
                    .service(login)
            )
    );
}