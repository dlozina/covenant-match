use crate::models::error::AppError;
use crate::models::geo_location::GeoLocation;
use crate::models::user::{
    CreateUserDto, FriendDto, LoginUserDto, UpdateUserProfileDto, User, UserResponse,
};
use crate::repository::user_repository;
use crate::utils::jwt;
use bcrypt::{hash, verify, DEFAULT_COST};
use log::{info, warn};
use mongodb::bson::oid::ObjectId;
use mongodb::{bson::doc, Database};

pub async fn create_user(
    db: &Database,
    user_data: CreateUserDto,
    requesting_user_role: Option<&str>,
    client_region: GeoLocation,
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
        // Default to user for all other cases
        _ => "user".to_string(),
    };

    let now = mongodb::bson::DateTime::now();
    let user = User {
        id: ObjectId::new(),
        username: user_data.username,
        email: user_data.email,
        password_hash,
        display_name: user_data.display_name,
        avatar_url: None,
        region: user_data.region,
        platform: user_data.platform,
        auto_region: user_data.auto_region,
        cm_region: client_region.cm_region,
        cf_region: client_region.cf_region,
        covenant_name: user_data.covenant_name,
        preferred_session_name: user_data.preferred_session_name,
        preferred_session_password: user_data.preferred_session_password,
        preferred_nightfarer: user_data.preferred_nightfarer,
        role,
        created_at: now,
        updated_at: now,
        friend_list: Vec::new(),
    };

    // Save the user to the database
    user_repository::create_user(db, &user).await?;

    Ok(UserResponse {
        id: user.id.to_hex(),
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        role: user.role,
        region: user.region,
        cm_region: user.cm_region,
        cf_region: user.cf_region,
        platform: user.platform,
        auto_region: user.auto_region,
        covenant_name: user.covenant_name,
        preferred_session_name: user.preferred_session_name,
        preferred_session_password: user.preferred_session_password,
        preferred_nightfarer: user.preferred_nightfarer,
        created_at: user.created_at,
        updated_at: user.updated_at,
        friend_list: user.friend_list.iter().map(|id| id.to_hex()).collect(),
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
        id: user.id.to_hex(),
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        region: user.region,
        auto_region: user.auto_region,
        cm_region: user.cm_region,
        cf_region: user.cf_region,
        platform: user.platform,
        covenant_name: user.covenant_name,
        role: user.role,
        preferred_session_name: user.preferred_session_name,
        preferred_session_password: user.preferred_session_password,
        preferred_nightfarer: user.preferred_nightfarer,
        created_at: user.created_at,
        updated_at: user.updated_at,
        friend_list: user.friend_list.iter().map(|id| id.to_hex()).collect(),
    };

    Ok((token, user_response))
}

pub async fn get_user_by_id(db: &Database, user_id: &str) -> Result<UserResponse, AppError> {
    let user = user_repository::find_user_by_id(db, user_id).await?;

    if let Some(user) = user {
        Ok(UserResponse {
            id: user.id.to_hex(),
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            region: user.region,
            auto_region: user.auto_region,
            cm_region: user.cm_region,
            cf_region: user.cf_region,
            platform: user.platform,
            covenant_name: user.covenant_name,
            role: user.role,
            preferred_session_name: user.preferred_session_name,
            preferred_session_password: user.preferred_session_password,
            preferred_nightfarer: user.preferred_nightfarer,
            created_at: user.created_at,
            updated_at: user.updated_at,
            friend_list: user.friend_list.iter().map(|id| id.to_hex()).collect(),
        })
    } else {
        Err(AppError::UserNotFound)
    }
}

// Create admin user if none exists
pub async fn ensure_admin_exists(db: &Database) -> Result<(), AppError> {
    // Check if any admin exists
    let admin_exists = user_repository::admin_exists(db).await?;

    if admin_exists {
        info!("Admin user already exists");
        Ok(())
    } else {
        // Get admin credentials from environment
        let admin_username =
            std::env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
        let admin_password = std::env::var("ADMIN_PASSWORD").unwrap_or_else(|_| {
            warn!("ADMIN_PASSWORD not set! Using default password - change this in production!");
            "changeme123#".to_string()
        });
        let admin_email =
            std::env::var("ADMIN_EMAIL").unwrap_or_else(|_| "admin@covenantmatch.com".to_string());

        // Create admin user
        let admin_data = CreateUserDto {
            username: admin_username,
            email: admin_email,
            password: admin_password,
            display_name: Some("Akri".to_string()),
            region: "EU".to_string(),
            auto_region: true,
            platform: "PlayStation".to_string(),
            covenant_name: "Covenant".to_string(),
            preferred_session_name: None,
            preferred_session_password: None,
            preferred_nightfarer: None,
            role: Some("admin".to_string()),
        };

        // Create client region
        let client_region = GeoLocation {
            cm_region: "Europe".to_string(),
            cf_region: None,
            country: "Unknown".to_string(),
            city: None,
            continent: None,
            region_code: None,
            metro_code: None,
            postal_code: None,
            timezone: None,
            latitude: None,
            longitude: None,
        };

        // Create admin with admin role (None for requesting_user_role will be overridden)
        match create_user(db, admin_data, Some("admin"), client_region).await {
            Ok(_) => {
                info!("Created default admin user successfully");
                Ok(())
            }
            Err(e) => {
                warn!("Failed to create default admin user: {:?}", e);
                Err(e)
            }
        }
    }
}

pub async fn update_user_profile(
    db: &Database,
    user_id: &str,
    update_data: UpdateUserProfileDto,
    client_region: GeoLocation,
) -> Result<UserResponse, AppError> {
    // Convert string ID to ObjectId for comparison
    let object_id = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    // Check if email is being updated and if it's already in use
    if let Some(email) = &update_data.email {
        if let Some(existing_user) = user_repository::find_by_email(db, email).await? {
            if existing_user.id != object_id {
                return Err(AppError::EmailAlreadyInUse);
            }
        }
    }

    // Check if display name is being updated and if it's already in use
    if let Some(display_name) = &update_data.display_name {
        if let Some(existing_user) = user_repository::find_by_display_name(db, display_name).await?
        {
            if existing_user.id != object_id {
                return Err(AppError::DisplayNameAlreadyInUse);
            }
        }
    }

    // Get the current timestamp as MongoDB DateTime
    let now = mongodb::bson::DateTime::now();

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
    if let Some(region) = update_data.region.clone() {
        update_doc.insert("region", region);
    }
    if let Some(auto_region) = update_data.auto_region {
        update_doc.insert("auto_region", auto_region);
    }

    // Region update if user is logging in from a different region
    let cm_region = client_region.cm_region;
    update_doc.insert("cm_region", cm_region);

    if let Some(cf_region) = client_region.cf_region {
        update_doc.insert("cf_region", cf_region);
    }
    if let Some(platform) = update_data.platform.clone() {
        update_doc.insert("platform", platform);
    }
    if let Some(covenant_name) = update_data.covenant_name.clone() {
        update_doc.insert("covenant_name", covenant_name);
    }
    if let Some(preferred_session_name) = update_data.preferred_session_name.clone() {
        update_doc.insert("preferred_session_name", preferred_session_name);
    }
    if let Some(preferred_session_password) = update_data.preferred_session_password.clone() {
        update_doc.insert("preferred_session_password", preferred_session_password);
    }
    if let Some(preferred_nightfarer) = update_data.preferred_nightfarer.clone() {
        update_doc.insert("preferred_nightfarer", preferred_nightfarer);
    }

    // Always update the updated_at field with MongoDB DateTime
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

    if user_exists.is_some() {
        // Delete the user
        user_repository::delete_user(db, user_id).await?;
        Ok(())
    } else {
        Err(AppError::UserNotFound)
    }
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
    let user_responses = users.into_iter().map(UserResponse::from).collect();

    Ok((user_responses, total, page))
}

pub async fn update_user_region(
    db: &Database,
    username: &str,
    client_region: GeoLocation,
) -> Result<(), AppError> {
    // Get the current timestamp
    let now = mongodb::bson::DateTime::now();

    // Find the user by username to get their ID
    let user = user_repository::find_by_username(db, username)
        .await?
        .ok_or(AppError::UserNotFound)?;

    // Create update document with region information
    let mut update_doc = doc! {
        "cm_region": client_region.cm_region,
        "updated_at": now,
    };

    // Add cloudflare region if available
    if let Some(cf_region) = client_region.cf_region {
        update_doc.insert("cf_region", cf_region);
    }

    // Use the repository layer to update the user
    let result = user_repository::update_user_with_doc(db, &user.id.to_hex(), update_doc).await?;

    if result.is_none() {
        return Err(AppError::UserNotFound);
    }

    Ok(())
}

/// Add a friend to the user's friend list
pub async fn add_friend(db: &Database, user_id: &str, friend_id: &str) -> Result<(), AppError> {
    // Cannot add yourself as a friend
    if user_id == friend_id {
        return Err(AppError::InvalidInput(
            "Cannot add yourself as a friend".to_string(),
        ));
    }

    // Add friend to user's friend list
    user_repository::add_friend(db, user_id, friend_id).await
}

/// Remove a friend from the user's friend list
pub async fn remove_friend(db: &Database, user_id: &str, friend_id: &str) -> Result<(), AppError> {
    user_repository::remove_friend(db, user_id, friend_id).await
}

/// Get the user's friend list with detailed information
pub async fn get_friend_list(db: &Database, user_id: &str) -> Result<Vec<FriendDto>, AppError> {
    let friends = user_repository::get_friend_list_details(db, user_id).await?;

    // Convert to FriendDto objects
    let friend_dtos = friends
        .into_iter()
        .map(|friend| FriendDto {
            id: friend.id.to_hex(),
            username: friend.username,
            display_name: friend.display_name,
            avatar_url: friend.avatar_url,
            covenant_name: friend.covenant_name,
            platform: friend.platform,
            region: friend.region,
        })
        .collect();

    Ok(friend_dtos)
}
