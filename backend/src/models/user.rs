use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct User {
    #[serde(rename = "_id")]
    pub id: String,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    #[schema(write_only)]
    pub password_hash: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Validate, ToSchema)]
pub struct CreateUserDto {
    #[validate(length(min = 3, max = 30))]
    pub username: String,
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    #[schema(format = "password")]
    pub password: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LoginUserDto {
    pub username: String,
    #[schema(format = "password")]
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateUserDto {
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            created_at: user.created_at,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}
