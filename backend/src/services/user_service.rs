use crate::models::error::AppError;
use crate::models::user::{CreateUserDto, LoginUserDto, UpdateUserProfileDto, User, UserResponse};
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

    // Check if display name already exists (if provided)
    if let Some(display_name) = &user_data.display_name {
        if user_repository::find_by_display_name(db, display_name)
            .await?
            .is_some()
        {
            return Err(AppError::DisplayNameAlreadyInUse);
        }
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

pub async fn update_user_profile(
    db: &Database,
    user_id: &str,
    update_data: UpdateUserProfileDto,
) -> Result<UserResponse, AppError> {
    // Check if email is being updated and if it's already in use
    if let Some(email) = &update_data.email {
        if let Some(existing_user) = user_repository::find_by_email(db, email).await? {
            if existing_user.id != user_id {
                return Err(AppError::EmailAlreadyInUse);
            }
        }
    }

    // Check if display name is being updated and if it's already in use
    if let Some(display_name) = &update_data.display_name {
        if let Some(existing_user) = user_repository::find_by_display_name(db, display_name).await?
        {
            if existing_user.id != user_id {
                return Err(AppError::DisplayNameAlreadyInUse);
            }
        }
    }

    // Get the current timestamp as a string in RFC3339 format
    let now = chrono::Utc::now().to_rfc3339();

    // Get the user first
    let user = user_repository::find_user_by_id(db, user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    // Create update document
    let mut update_doc = doc! {};

    if let Some(email) = update_data.email.clone() {
        update_doc.insert("email", email);
    }
    if let Some(display_name) = update_data.display_name.clone() {
        update_doc.insert("display_name", display_name);
    }
    if let Some(avatar_url) = update_data.avatar_url.clone() {
        update_doc.insert("avatar_url", avatar_url);
    }
    if let Some(password) = update_data.password.clone() {
        let password_hash =
            hash(&password, DEFAULT_COST).map_err(|e| AppError::InternalError(e.to_string()))?;
        update_doc.insert("password_hash", password_hash);
    }

    // Always update the updated_at field with string timestamp
    update_doc.insert("updated_at", now);

    // Update the user
    user_repository::update_user_with_doc(db, user_id, update_doc).await?;

    // Get the updated user
    let updated_user = user_repository::find_user_by_id(db, user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    Ok(updated_user.into())
}

pub async fn delete_user(db: &Database, user_id: &str) -> Result<(), AppError> {
    // Check if the user exists first
    let user_exists = user_repository::find_user_by_id(db, user_id).await?;

    if user_exists.is_none() {
        return Err(AppError::UserNotFound);
    }

    // Delete the user
    user_repository::delete_user(db, user_id).await?;

    Ok(())
}

/// Get all users, optionally filtered by role
pub async fn get_all_users(
    db: &Database,
    role: Option<&str>,
) -> Result<Vec<UserResponse>, AppError> {
    // Call the repository function to get users
    let users = user_repository::find_users_by_role(db, role).await?;

    // Convert to UserResponse objects
    let user_responses = users
        .into_iter()
        .map(|user| UserResponse::from(user))
        .collect();

    Ok(user_responses)
}

/// Get paginated list of users, optionally filtered by role
pub async fn get_users_paginated(
    db: &Database,
    role: Option<&str>,
    page: u64,
    limit: u64,
) -> Result<(Vec<UserResponse>, u64, u64), AppError> {
    // Ensure page and limit are valid
    let page = if page < 1 { 1 } else { page };
    let limit = if limit < 1 { 10 } else { limit };

    // Get total count for pagination metadata
    let total = user_repository::count_users_by_role(db, role).await?;

    // Get paginated users
    let users = user_repository::find_users_by_role_paginated(db, role, page, limit).await?;

    // Convert to UserResponse objects
    let user_responses = users
        .into_iter()
        .map(|user| UserResponse::from(user))
        .collect();

    Ok((user_responses, total, page))
}
