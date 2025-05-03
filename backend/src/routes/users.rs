use crate::models::error::AppError;
use crate::models::user::{
    AddFriendDto, CreateUserDto, FriendListResponse, GetUsersQuery, LoginUserDto,
    UpdateUserProfileDto,
};
use crate::services::{auth_service, user_service};
use crate::utils::{email, geo_location, ip_address, jwt};
use actix_web::{
    delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder, ResponseError,
};
use mongodb::Database;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Create a new user
#[utoipa::path(
    post,
    path = "/api/v1/register",
    request_body = CreateUserDto,
    responses(
        (status = 201, description = "User created successfully", body = UserResponse),
        (status = 400, description = "Invalid input"),
        (status = 409, description = "User already exists"),
        (status = 500, description = "Internal server error")
    ),
    tag = "users"
)]
#[post("/api/v1/register")]
async fn create_user(
    db: web::Data<Database>,
    user_data: web::Json<CreateUserDto>,
    req: HttpRequest,
) -> impl Responder {
    // Check if request has authentication (for role check) -> In order for admins to create users
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

    // Get the client region
    let client_region = geo_location::get_client_region(&req);

    // Pass the requesting user's role (if any) to determine if they can create an admin
    match user_service::create_user(
        &db,
        user_data.into_inner(),
        requesting_user_role.as_deref(),
        client_region,
    )
    .await
    {
        Ok(user) => HttpResponse::Created().json(user),
        Err(e) => {
            log::error!("Error creating user: {:?}", e);
            e.error_response()
        }
    }
}

/// Verify new user
#[utoipa::path(
    post,
    path = "/api/v1/verify-email",
    request_body = String,
    responses(
        (status = 200, description = "Email verified successfully"),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    tag = "users"
)]
#[post("/api/v1/verify-email")]
async fn verify_email(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    let token = req.query_string();
    let token_data = jwt::validate_email_verification_token(token);

    let claims = match token_data {
        Ok(claims) => claims,
        Err(e) => {
            log::error!("Error verifying email: {:?}", e);
            return e.error_response();
        }
    };

    if claims.purpose != "email_verification" {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "status": "error",
            "message": "Invalid token purpose"
        }));
    }

    // Update user email in db email_verified to true
    match user_service::update_user_email_verified(&db, &claims.sub, true).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Email verified successfully"
        })),
        Err(e) => {
            log::error!("Error verifying email: {:?}", e);
            e.error_response()
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResetPasswordDto {
    pub email: String,
}

/// Send reset password email
#[utoipa::path(
    post,
    path = "/api/v1/reset-password-email",
    request_body = ResetPasswordDto,
    responses(
        (status = 200, description = "Email sent successfully"),            
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    tag = "users"
)]
#[post("/api/v1/reset-password-email")]
async fn send_reset_password_email(
    db: web::Data<Database>,
    reset_password_data: web::Json<ResetPasswordDto>,
) -> impl Responder {
    // Grab the email from the request body
    let reset_password_data = reset_password_data.into_inner();

    // Define the success response once
    let success_response = HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Email sent successfully"
    }));

    // Check if the email is valid
    if !email::is_valid_email(&reset_password_data.email) {
        return success_response;
    }

    // Send the reset password email -> we always want to return ok even if the user doesn't exist - security
    match user_service::send_reset_password_email(&db, &reset_password_data.email).await {
        Ok(()) => success_response,
        Err(e) => {
            log::error!("Error sending reset password email: {:?}", e);
            success_response
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewPasswordDto {
    pub password: String,
}

/// Reset password endpoint
#[utoipa::path(
    post,
    path = "/api/v1/reset-password",
    request_body = NewPasswordDto,
    responses(
        (status = 200, description = "Password reset successfully"),
        (status = 400, description = "Invalid input"),          
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    tag = "users"
)]
#[post("/api/v1/reset-password")]
async fn reset_password(
    db: web::Data<Database>,
    new_password_data: web::Json<NewPasswordDto>,
    req: HttpRequest,
) -> impl Responder {
    let token = req.query_string();

    // First validate the JWT to ensure proper format
    let token_data = jwt::validate_reset_password_token(token);
    if token_data.is_err() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "status": "error",
            "message": "Invalid token format"
        }));
    }

    // Then use the token repository to reset password with token validation
    match user_service::reset_password_with_token(&db, token, &new_password_data.password).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Password reset successfully"
        })),
        Err(e) => {
            log::error!("Error resetting password: {:?}", e);
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
        (status = 400, description = "CAPTCHA verification failed"),
        (status = 500, description = "Internal server error")
    ),
    tag = "users"
)]
#[post("/api/v1/auth/login")]
async fn login(
    db: web::Data<Database>,
    credentials: web::Json<LoginUserDto>,
    req: HttpRequest,
) -> impl Responder {
    let login_data = credentials.into_inner();

    // Get the client IP address
    let ip_address = ip_address::get_client_ip(&req);

    // Get the client region
    let client_region = geo_location::get_client_region(&req);

    log::info!("Turnstile token: {:?}", login_data.turnstile_token);
    // Verify the turnstile token
    if let Err(e) = auth_service::verify_turnstile_token(
        &db,
        &login_data.username,
        &ip_address,
        login_data.turnstile_token.as_deref(),
    )
    .await
    {
        log::warn!(
            "Turnstile verification failed for user {}: {:?}",
            &login_data.username,
            e
        );

        // For Turnstile required errors, provide a more helpful response
        if let AppError::CaptchaRequired(_) = &e {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string(),
                "requiresTurnstile": true
            }));
        }

        return e.error_response();
    }

    // If necessary, update the user's region in db
    match user_service::update_user_region(&db, &login_data.username, client_region).await {
        Ok(()) => (),
        Err(e) => {
            log::error!("Error updating user region: {:?}", e);
        }
    }

    // Proceed with login after CAPTCHA verification
    match user_service::login_user(&db, login_data.clone()).await {
        Ok((token, user)) => {
            // Record successful login attempt
            if let Err(e) = auth_service::record_login_attempt(
                &db,
                &login_data.username,
                &ip_address,
                true, // successful
            )
            .await
            {
                log::error!("Failed to record successful login attempt: {:?}", e);
                // Continue anyway since login was successful
            }

            HttpResponse::Ok().json(serde_json::json!({
                "status": "success",
                "token": token,
                "user": user
            }))
        }
        Err(e) => {
            // Record failed login attempt
            if let Err(record_err) = auth_service::record_login_attempt(
                &db,
                &login_data.username,
                &ip_address,
                false, // failed
            )
            .await
            {
                log::error!("Failed to record failed login attempt: {:?}", record_err);
                // Continue with normal error response
            }

            log::error!("Login error for user {}: {:?}", &login_data.username, e);
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
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
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
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Get the client region
    let client_region = geo_location::get_client_region(&req);

    // Update the user profile
    match user_service::update_user_profile(&db, &user_id, update_data.into_inner(), client_region)
        .await
    {
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
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Delete the user
    match user_service::delete_user(&db, &user_id).await {
        Ok(()) => HttpResponse::NoContent().finish(),
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
#[post("/api/v1/admin/users")]
async fn create_admin_user(
    db: web::Data<Database>,
    user_data: web::Json<CreateUserDto>,
    req: HttpRequest,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let claims = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.clone()
    };

    // Middleware already checked admin role, but we can double-check here
    if claims.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    // Create a new user with admin role
    let mut admin_user_data = user_data.into_inner();
    admin_user_data.role = Some("admin".to_string());

    // Get the client region
    let client_region = geo_location::get_client_region(&req);

    match user_service::create_user(&db, admin_user_data, Some("admin"), client_region).await {
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
#[get("/api/v1/admin/users")]
async fn get_all_users(
    db: web::Data<Database>,
    req: HttpRequest,
    query: web::Query<GetUsersQuery>,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    let claims = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.clone()
    };

    // Middleware already checked admin role, but we can double-check here
    if claims.role != "admin" {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin role required"
        }));
    }

    // Get paginated users
    match user_service::get_users_paginated(&db, query.role.as_deref(), query.page, query.limit)
        .await
    {
        Ok((users, total, page)) => {
            // Calculate total pages using the built-in div_ceil method
            let total_pages = if query.limit > 0 {
                total.div_ceil(query.limit)
            } else {
                0
            };

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
#[get("/api/v1/admin/users/{user_id}")]
async fn get_user_by_id_admin(db: web::Data<Database>, path: web::Path<String>) -> impl Responder {
    // Middleware already checks for admin role
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
#[put("/api/v1/admin/users/{user_id}")]
async fn update_user_admin(
    db: web::Data<Database>,
    path: web::Path<String>,
    update_data: web::Json<UpdateUserProfileDto>,
    req: HttpRequest,
) -> impl Responder {
    // Middleware already checks for admin role
    let user_id = path.into_inner();

    // Get the client region
    let client_region = geo_location::get_client_region(&req);

    match user_service::update_user_profile(&db, &user_id, update_data.into_inner(), client_region)
        .await
    {
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
#[delete("/api/v1/admin/users/{user_id}")]
async fn delete_user_admin(db: web::Data<Database>, path: web::Path<String>) -> impl Responder {
    // Middleware already checks for admin role
    let user_id = path.into_inner();

    match user_service::delete_user(&db, &user_id).await {
        Ok(()) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Error deleting user: {:?}", e);
            e.error_response()
        }
    }
}

/// Refresh JWT token
#[utoipa::path(
    post,
    path = "/api/v1/auth/refresh",
    responses(
        (status = 200, description = "Token refreshed successfully", body = RefreshTokenResponse),
        (status = 401, description = "Invalid or expired token"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users"
)]
#[post("/api/v1/auth/refresh")]
async fn refresh_token(req: HttpRequest) -> impl Responder {
    // The auth middleware has already validated the token
    // Extract claims from the request extensions
    let claims = {
        let extensions = req.extensions();
        match extensions.get::<jwt::Claims>() {
            Some(claims) => claims.clone(),
            None => {
                // This should never happen as middleware validates the token
                // But we handle it anyway for robustness
                return HttpResponse::Unauthorized().json(serde_json::json!({
                    "status": "error",
                    "message": "Invalid token"
                }));
            }
        }
    };

    // Check if the token is already expired
    let now = chrono::Utc::now().timestamp();
    let exp_i64 = i64::try_from(claims.exp).unwrap_or(i64::MAX);
    if exp_i64 < now {
        return HttpResponse::Unauthorized().json(serde_json::json!({
            "status": "error",
            "message": "Token has expired"
        }));
    }

    // Parse the user ID from the token
    let Ok(user_id) = mongodb::bson::oid::ObjectId::parse_str(&claims.sub) else {
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "status": "error",
            "message": "Invalid user ID format in token"
        }));
    };

    // Generate a new token with the same user ID and role
    match jwt::generate_token(&user_id, &claims.role) {
        Ok(new_token) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "token": new_token
        })),
        Err(e) => {
            log::error!("Error refreshing token: {:?}", e);
            e.error_response()
        }
    }
}

/// JWT decode info DTO
#[derive(Serialize, Deserialize, ToSchema)]
pub struct JwtInfoDto {
    pub token: String,
}

/// Response with token info
#[derive(Serialize, Deserialize, ToSchema)]
pub struct TokenInfoResponse {
    pub sub: String,
    pub role: String,
    pub iat: usize,
    pub exp: usize,
    pub expires_at: String,
    pub is_valid: bool,
    pub time_to_expiry: String,
}

/// Decode and validate a JWT token
#[utoipa::path(
    post,
    path = "/api/v1/auth/decode-token",
    request_body = JwtInfoDto,
    responses(
        (status = 200, description = "Token decoded successfully", body = TokenInfoResponse),
        (status = 400, description = "Invalid token format"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users"
)]
#[post("/api/v1/auth/decode-token")]
async fn decode_token(token_data: web::Json<JwtInfoDto>, req: HttpRequest) -> impl Responder {
    // Verify that the user is authenticated
    // todo: remove this once we have a proper auth middleware
    let _authenticated_user_id = {
        let extensions = req.extensions();
        match extensions.get::<jwt::Claims>() {
            Some(claims) => claims.sub.clone(),
            None => {
                return HttpResponse::Unauthorized().json(serde_json::json!({
                    "status": "error",
                    "message": "Authentication required to decode tokens"
                }));
            }
        }
    };

    // Optionally check if user has admin role for additional security
    // This is commented out to allow any authenticated user to decode tokens
    // Consider uncommenting this if you want to restrict token decoding to admins only

    let is_admin = {
        let extensions = req.extensions();
        match extensions.get::<jwt::Claims>() {
            Some(claims) => claims.role == "admin",
            None => false,
        }
    };

    if !is_admin {
        return HttpResponse::Forbidden().json(serde_json::json!({
            "status": "error",
            "message": "Admin access required to decode tokens"
        }));
    }

    let token = &token_data.token;

    // Parse and validate the token
    match jwt::decode_token(token) {
        Ok(claims) => {
            // Get current time for validity check
            let now = chrono::Utc::now().timestamp();
            let exp_i64 = i64::try_from(claims.exp).unwrap_or(i64::MAX);
            let is_valid = exp_i64 > now;

            // Calculate time to expiry
            let seconds_to_expiry = if is_valid {
                usize::try_from((exp_i64 - now).max(0)).unwrap_or(0)
            } else {
                0
            };

            // Format expiry time
            let expires_at = chrono::DateTime::<chrono::Utc>::from_timestamp(exp_i64, 0)
                .map_or_else(|| "Invalid timestamp".to_string(), |dt| dt.to_rfc3339());

            // Format time to expiry in a human-readable format
            let time_to_expiry = if is_valid {
                let days = seconds_to_expiry / 86400;
                let hours = (seconds_to_expiry % 86400) / 3600;
                let minutes = (seconds_to_expiry % 3600) / 60;
                let seconds = seconds_to_expiry % 60;

                if days > 0 {
                    format!("{days}d {hours}h {minutes}m {seconds}s")
                } else if hours > 0 {
                    format!("{hours}h {minutes}m {seconds}s")
                } else if minutes > 0 {
                    format!("{minutes}m {seconds}s")
                } else {
                    format!("{seconds}s")
                }
            } else {
                "Expired".to_string()
            };

            // Create response
            let token_info = TokenInfoResponse {
                sub: claims.sub,
                role: claims.role,
                iat: claims.iat,
                exp: claims.exp,
                expires_at,
                is_valid,
                time_to_expiry,
            };

            HttpResponse::Ok().json(token_info)
        }
        Err(e) => {
            log::error!("Error decoding token: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": format!("Invalid token: {}", e)
            }))
        }
    }
}

/// Get user's friend list
#[utoipa::path(
    get,
    path = "/api/v1/friends",
    responses(
        (status = 200, description = "Friend list retrieved successfully", body = FriendListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users"
)]
#[get("/api/v1/friends")]
async fn get_friend_list(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Get the friend list
    match user_service::get_friend_list(&db, &user_id).await {
        Ok(friends) => {
            // Create response
            let response = FriendListResponse {
                friends: friends.clone(),
                total: friends.len(),
            };
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            log::error!("Error fetching friend list: {:?}", e);
            e.error_response()
        }
    }
}

/// Add a friend to the user's friend list
#[utoipa::path(
    post,
    path = "/api/v1/friends",
    request_body = AddFriendDto,
    responses(
        (status = 201, description = "Friend added successfully"),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User not found"),
        (status = 409, description = "Friend limit reached"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users"
)]
#[post("/api/v1/friends")]
async fn add_friend(
    db: web::Data<Database>,
    req: HttpRequest,
    friend_data: web::Json<AddFriendDto>,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Add friend
    match user_service::add_friend(&db, &user_id, &friend_data.friend_id).await {
        Ok(()) => HttpResponse::Created().json(serde_json::json!({
            "status": "success",
            "message": "Friend added to your list"
        })),
        Err(e) => {
            log::error!("Error adding friend: {:?}", e);
            e.error_response()
        }
    }
}

/// Remove a friend from the user's friend list
#[utoipa::path(
    delete,
    path = "/api/v1/friends/{friend_id}",
    params(
        ("friend_id" = String, Path, description = "ID of the friend to remove")
    ),
    responses(
        (status = 200, description = "Friend removed successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users"
)]
#[delete("/api/v1/friends/{friend_id}")]
async fn remove_friend(
    db: web::Data<Database>,
    req: HttpRequest,
    path: web::Path<String>,
) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    let friend_id = path.into_inner();

    // Remove friend
    match user_service::remove_friend(&db, &user_id, &friend_id).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Friend removed from your list"
        })),
        Err(e) => {
            log::error!("Error removing friend: {:?}", e);
            e.error_response()
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring user routes");
    cfg.service(create_user);
    cfg.service(login);
    cfg.service(get_current_user);
    cfg.service(update_profile);
    cfg.service(delete_user);
    cfg.service(create_admin_user);
    cfg.service(get_all_users);
    cfg.service(get_user_by_id_admin);
    cfg.service(update_user_admin);
    cfg.service(delete_user_admin);
    cfg.service(refresh_token);
    cfg.service(decode_token);
    cfg.service(get_friend_list);
    cfg.service(add_friend);
    cfg.service(remove_friend);
    cfg.service(verify_email);
}
