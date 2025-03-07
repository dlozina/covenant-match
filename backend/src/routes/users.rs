use actix_web::{web, HttpResponse, Responder, post, get, put};
use mongodb::Database;
use crate::models::user::{CreateUserDto, LoginUserDto, UserResponse};
use crate::services::user_service;

#[post("/users")]
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

#[post("/users/login")]
async fn login(
    db: web::Data<Database>,
    credentials: web::Json<LoginUserDto>,
) -> impl Responder {
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

#[get("/users/me")]
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
    cfg.service(create_user)
       .service(login)
       .service(get_current_user);
}
