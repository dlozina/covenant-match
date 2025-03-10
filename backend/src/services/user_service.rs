use crate::models::error::AppError;
use crate::models::user::{CreateUserDto, LoginUserDto, User, UserResponse};
use crate::repository::user_repository;
use crate::utils::jwt;
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use log::{info, warn};
use mongodb::{bson::doc, Database};
use uuid::Uuid;

pub async fn create_user(
    db: &Database,
    user_data: CreateUserDto,
    requesting_user_role: Option<&str>,
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

    // Determine the role
    // Only allow admin role if the requesting user is an admin
    let role = match (user_data.role, requesting_user_role) {
        (Some(role), Some("admin")) if role == "admin" => "admin".to_string(),
        (Some(_), _) => "user".to_string(), // Default to user if not admin or no requesting user
        (None, _) => "user".to_string(),    // Default role is user
    };

    let now = Utc::now();
    let user = User {
        id: Uuid::new_v4().to_string(),
        username: user_data.username,
        email: user_data.email,
        password_hash,
        display_name: user_data.display_name,
        avatar_url: None,
        role,
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
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
    })
}

pub async fn login_user(
    db: &Database,
    login_data: LoginUserDto,
) -> Result<(String, UserResponse), AppError> {
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

    // Generate JWT token with the user's role
    let token = jwt::generate_token(&user.id, &user.role)?;

    // Create user response (without password)
    let user_response = UserResponse {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
    };

    Ok((token, user_response))
}

pub async fn get_user_by_id(db: &Database, user_id: &str) -> Result<UserResponse, AppError> {
    let user = user_repository::find_user_by_id(db, user_id).await?;

    if let Some(user) = user {
        Ok(UserResponse {
            id: user.id.to_string(),
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            role: user.role,
            created_at: user.created_at,
            updated_at: user.updated_at,
        })
    } else {
        Err(AppError::UserNotFound)
    }
}

// Create admin user if none exists
pub async fn ensure_admin_exists(db: &Database) -> Result<(), AppError> {
    // Check if any admin exists
    let admin_exists = user_repository::admin_exists(db).await?;

    if !admin_exists {
        // Get admin credentials from environment
        let admin_username =
            std::env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
        let admin_password = std::env::var("ADMIN_PASSWORD").unwrap_or_else(|_| {
            warn!("ADMIN_PASSWORD not set! Using default password - change this in production!");
            "changeme123".to_string()
        });
        let admin_email =
            std::env::var("ADMIN_EMAIL").unwrap_or_else(|_| "admin@covenantmatch.com".to_string());

        // Create admin user
        let admin_data = CreateUserDto {
            username: admin_username,
            email: admin_email,
            password: admin_password,
            display_name: Some("Administrator".to_string()),
            role: Some("admin".to_string()),
        };

        // Create admin with admin role (None for requesting_user_role will be overridden)
        match create_user(db, admin_data, Some("admin")).await {
            Ok(_) => {
                info!("Created default admin user successfully");
                Ok(())
            }
            Err(e) => {
                warn!("Failed to create default admin user: {:?}", e);
                Err(e)
            }
        }
    } else {
        info!("Admin user already exists");
        Ok(())
    }
}
