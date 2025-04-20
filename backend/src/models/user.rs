use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::IntoParams;
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct User {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub username: String,
    pub email: String,
    #[serde(rename = "password_hash")]
    #[serde(skip_serializing_if = "is_api_response")]
    #[schema(write_only)]
    pub password_hash: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub region: String,
    pub auto_region: bool,
    pub cm_region: String,
    pub cf_region: Option<String>,
    pub platform: String,
    pub covenant_name: String,
    pub role: String, // "admin" or "user"
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub preferred_session_name: Option<String>,
    pub preferred_session_password: Option<String>,
    pub preferred_nightfarer: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserDto {
    #[validate(length(min = 3, max = 30))]
    pub username: String,
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    #[schema(format = "password")]
    pub password: String,
    pub display_name: Option<String>,
    pub region: String,
    pub auto_region: bool,
    pub cm_region: String,
    pub cf_region: Option<String>,
    pub platform: String,
    pub covenant_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>, // Only used by admins when creating users
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preferred_session_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preferred_session_password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preferred_nightfarer: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub region: String,
    pub auto_region: bool,
    pub cm_region: String,
    pub cf_region: Option<String>,
    pub covenant_name: String,
    pub role: String,
    pub platform: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub preferred_session_name: Option<String>,
    pub preferred_session_password: Option<String>,
    pub preferred_nightfarer: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct LoginUserDto {
    pub username: String,
    #[schema(format = "password")]
    pub password: String,
    /// reCAPTCHA token for verification
    #[serde(rename = "captchaToken")]
    pub captcha_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateUserDto {
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserProfileDto {
    pub email: Option<String>,
    #[schema(format = "password")]
    pub password: Option<String>,
    pub display_name: Option<String>,
    pub region: Option<String>,
    pub auto_region: Option<bool>,
    pub cm_region: Option<String>,
    pub cf_region: Option<String>,
    pub platform: Option<String>,
    pub covenant_name: Option<String>,
    pub avatar_url: Option<String>,
    pub preferred_session_name: Option<String>,
    pub preferred_session_password: Option<String>,
    pub preferred_nightfarer: Option<String>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id.to_hex(),
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            region: user.region,
            auto_region: user.auto_region,
            cm_region: user.cm_region,
            cf_region: user.cf_region,
            covenant_name: user.covenant_name,
            role: user.role,
            platform: user.platform,
            created_at: user.created_at,
            updated_at: user.updated_at,
            preferred_session_name: user.preferred_session_name,
            preferred_session_password: user.preferred_session_password,
            preferred_nightfarer: user.preferred_nightfarer,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

/// Query parameters for getting users
#[derive(Deserialize, IntoParams, ToSchema)]
pub struct GetUsersQuery {
    /// Filter users by role (e.g., 'user' or 'admin')
    pub role: Option<String>,

    /// Page number (default: 1)
    #[serde(default = "default_page")]
    pub page: u64,

    /// Items per page (default: 10)
    #[serde(default = "default_limit")]
    pub limit: u64,
}

fn default_page() -> u64 {
    1
}

fn default_limit() -> u64 {
    10
}

fn is_api_response(_: &str) -> bool {
    false
}

/// Response format for paginated users list
#[derive(Serialize, ToSchema)]
pub struct UsersListResponse {
    /// Status of the response
    pub status: String,

    /// Response data containing users and pagination info
    pub data: UsersListData,
}

/// Data structure for users list response
#[derive(Serialize, ToSchema)]
pub struct UsersListData {
    /// List of user objects
    pub users: Vec<UserResponse>,

    /// Pagination metadata
    pub pagination: PaginationInfo,
}

/// Pagination metadata
#[derive(Serialize, ToSchema)]
pub struct PaginationInfo {
    /// Total number of users matching the query
    pub total: u64,

    /// Current page number
    pub page: u64,

    /// Number of items per page
    pub limit: u64,

    /// Total number of pages
    pub total_pages: u64,
}

/// Response data for token refresh
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct RefreshTokenResponse {
    /// Status of the operation
    pub status: String,
    /// The new JWT token
    pub token: String,
}
