use crate::models::error::AppError;
use crate::models::user::{CreateUserDto, LoginUserDto, User, UserResponse};
use crate::repository::user_repository;
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use log::info;
use mongodb::{bson::doc, Database};
use uuid::Uuid;

pub async fn create_user(
    db: &Database,
    user_data: CreateUserDto,
) -> Result<UserResponse, AppError> {
    // Check if username or email already exists
    if user_repository::find_by_username_or_email(db, &user_data.username, &user_data.email)
        .await?
        .is_some()
    {
        return Err(AppError::UserAlreadyExists);
    }
    // Hash the password
    let password_hash = hash(&user_data.password, DEFAULT_COST)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let now = Utc::now();
    let user = User {
        id: Uuid::new_v4().to_string(),
        username: user_data.username,
        email: user_data.email,
        password_hash,
        display_name: user_data.display_name,
        avatar_url: None,
        created_at: now,
        updated_at: now,
    };

    // Save the user to the database
    user_repository::create_user(db, &user).await?;

    Ok(UserResponse {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
    })
}

pub async fn login_user(db: &Database, login_data: LoginUserDto) -> Result<String, AppError> {
    // Find the user by username
    let user = user_repository::find_by_username(db, &login_data.username)
        .await?
        .ok_or(AppError::InvalidCredentials)?;

    // Verify the password
    let password_matches = verify(&login_data.password, &user.password_hash)
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    if !password_matches {
        return Err(AppError::InvalidCredentials);
    }

    // Generate JWT token - this is a placeholder for now
    // In a real implementation, this would use the jsonwebtoken crate
    Ok("placeholder_jwt_token".to_string())
}

pub async fn get_user_by_id(db: &Database, user_id: &str) -> Result<UserResponse, AppError> {
    let user = user_repository::find_user_by_id(db, user_id).await?;

    Ok(UserResponse {
        id: user.id.to_string(),
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
    })
}

/// Validate a JWT token and return the user ID
pub fn validate_token(token: &str) -> Result<String, Box<dyn std::error::Error>> {
    // This is where you would validate the JWT token
    // For now, we'll just return a placeholder error

    // TODO: Implement proper JWT validation
    // 1. Decode the token
    // 2. Verify the signature
    // 3. Check if the token is expired
    // 4. Extract and return the user ID from the token claims

    Err("Token validation not implemented".into())
}
