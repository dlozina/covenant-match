use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use mongodb::bson;
use serde_json::json;
use std::fmt;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] mongodb::error::Error),

    #[error("Database serialization error: {0}")]
    BsonError(#[from] bson::ser::Error),

    #[error("User not found")]
    UserNotFound,

    #[error("Session not found")]
    SessionNotFound,

    #[error("User already exists")]
    UserAlreadyExists,

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Invalid id format")]
    InvalidId,

    #[error("Session is already full")]
    SessionFull,

    #[error("Session is not in the correct state")]
    InvalidSessionState,

    #[error("User is already in the session")]
    UserAlreadyInSession,

    #[error("Authentication error: {0}")]
    AuthError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),

    #[error("Internal server error: {0}")]
    InternalError(String),

    #[error("Token expired")]
    TokenExpired,

    #[error("Invalid token")]
    InvalidToken,

    #[error("Authentication required")]
    AuthenticationRequired,

    #[error("Insufficient permissions")]
    InsufficientPermissions,

    #[error("Email already in use")]
    EmailAlreadyInUse,

    #[error("Display name already in use")]
    DisplayNameAlreadyInUse,

    // Added variants that are used in session_service.rs
    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Forbidden: {0}")]
    Forbidden(String),

    // New CAPTCHA verification error
    #[error("CAPTCHA verification failed: {0}")]
    CaptchaVerificationFailed(String),

    #[error("CAPTCHA required: {0}")]
    CaptchaRequired(String),

    #[error("Invalid object id: {0}")]
    InvalidObjectId(String),
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let status_code = self.status_code();

        HttpResponse::build(status_code).json(json!({
            "status": "error",
            "message": self.to_string()
        }))
    }

    fn status_code(&self) -> StatusCode {
        match self {
            AppError::InvalidCredentials => StatusCode::UNAUTHORIZED,
            AppError::TokenExpired => StatusCode::UNAUTHORIZED,
            AppError::InvalidToken => StatusCode::UNAUTHORIZED,
            AppError::AuthenticationRequired => StatusCode::UNAUTHORIZED,
            AppError::AuthError(_) => StatusCode::UNAUTHORIZED,
            AppError::InsufficientPermissions => StatusCode::FORBIDDEN,
            AppError::Forbidden(_) => StatusCode::FORBIDDEN,

            AppError::UserNotFound => StatusCode::NOT_FOUND,
            AppError::SessionNotFound => StatusCode::NOT_FOUND,

            AppError::UserAlreadyExists => StatusCode::CONFLICT,
            AppError::UserAlreadyInSession => StatusCode::CONFLICT,
            AppError::SessionFull => StatusCode::CONFLICT,

            AppError::ValidationError(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidSessionState => StatusCode::BAD_REQUEST,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,

            AppError::DatabaseError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::BsonError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR,

            AppError::EmailAlreadyInUse => StatusCode::CONFLICT,
            AppError::DisplayNameAlreadyInUse => StatusCode::CONFLICT,

            AppError::CaptchaVerificationFailed(_) => StatusCode::BAD_REQUEST,
            AppError::CaptchaRequired(_) => StatusCode::BAD_REQUEST,

            AppError::InvalidId => StatusCode::BAD_REQUEST,

            AppError::InvalidObjectId(_) => StatusCode::BAD_REQUEST,
        }
    }
}
