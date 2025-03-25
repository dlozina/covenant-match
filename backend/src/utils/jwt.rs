use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

use crate::config::get_config;
use crate::models::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,  // Subject (user ID)
    pub role: String, // Role: "admin" or "user"
    pub exp: usize,   // Expiration time (as UTC timestamp)
    pub iat: usize,   // Issued at (as UTC timestamp)
}

// Generate a JWT for a user
pub fn generate_token(user_id: &ObjectId, role: &str) -> Result<String, AppError> {
    let config = get_config();
    let jwt_secret = config.jwt_secret();

    // Parse expiration time from config
    let expires_in = config.jwt_expires_in();
    let hours = parse_duration(expires_in).unwrap_or(24); // Default to 24 hours

    // Set token expiration
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(hours))
        .expect("valid timestamp")
        .timestamp() as usize;

    let issued_at = Utc::now().timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_hex(),
        role: role.to_owned(),
        exp: expiration,
        iat: issued_at,
    };

    // Create the token
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalError(format!("Token generation error: {}", e)))
}

// Validate a JWT and extract the claims
pub fn validate_token(token: &str) -> Result<Claims, AppError> {
    let config = get_config();
    let jwt_secret = config.jwt_secret();

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map(|token_data| token_data.claims)
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::TokenExpired,
        _ => AppError::InvalidToken,
    })
}

// Extract user ID from token
pub fn get_user_id_from_token(token: &str) -> Result<String, AppError> {
    let claims = validate_token(token)?;
    Ok(claims.sub)
}

// Extract role from token
pub fn get_role_from_token(token: &str) -> Result<String, AppError> {
    let claims = validate_token(token)?;
    Ok(claims.role)
}

// Parse duration string like "60m", "24h", "7d" to hours
fn parse_duration(duration_str: &str) -> Option<i64> {
    let len = duration_str.len();
    if len < 2 {
        return None;
    }

    let (value_str, unit) = duration_str.split_at(len - 1);

    let value = match value_str.parse::<i64>() {
        Ok(v) => v,
        Err(_) => return None,
    };

    match unit {
        "m" => Some(value / 60), // minutes to hours
        "h" => Some(value),      // already hours
        "d" => Some(value * 24), // days to hours
        _ => None,
    }
}
