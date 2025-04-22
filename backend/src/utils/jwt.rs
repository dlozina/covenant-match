use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

use crate::config::get_config;
use crate::models::error::AppError;

/// Claims structure for JWT tokens
///
/// This defines the payload of our JSON Web Tokens
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,  // Subject (user ID)
    pub role: String, // Role: "admin" or "user"
    pub exp: usize,   // Expiration time (as UTC timestamp)
    pub iat: usize,   // Issued at (as UTC timestamp)
}

/// Generate a JWT for a user
///
/// # Arguments
/// * `user_id` - The `MongoDB` `ObjectId` of the user
/// * `role` - The role of the user ("admin" or "user")
///
/// # Returns
/// A Result containing either the encoded JWT or an `AppError`
///
/// # Duration format
/// The token expiration is controlled by the `jwt.expires_in` setting in config,
/// which accepts the following formats:
/// - "30s" - 30 seconds
/// - "10m" - 10 minutes
/// - "12h" - 12 hours (default)
/// - "7d" - 7 days
pub fn generate_token(user_id: &ObjectId, role: &str) -> Result<String, AppError> {
    let config = get_config();
    let jwt_secret = config.jwt_secret();

    // Parse expiration time from config
    let expires_in = config.jwt_expires_in();

    // Calculate expiration time based on the configured duration
    let expiration = if let Some(seconds) = parse_duration_to_seconds(expires_in) {
        let now = Utc::now().timestamp();
        (now + seconds).max(0) as usize
    } else {
        // Default to 12 hours if parsing fails
        log::warn!(
            "Invalid duration format in config: '{}'. Using default of 12h",
            expires_in
        );
        let now = Utc::now().timestamp();
        (now + 12 * 3600).max(0) as usize
    };

    let issued_at = Utc::now().timestamp().max(0) as usize;

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
    .map_err(|e| AppError::InternalError(format!("Token generation error: {e}")))
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

// Extract role from token
pub fn get_role_from_token(token: &str) -> Result<String, AppError> {
    let claims = validate_token(token)?;
    Ok(claims.role)
}

// Decode a token without validating expiration
pub fn decode_token(token: &str) -> Result<Claims, AppError> {
    let config = get_config();
    let jwt_secret = config.jwt_secret();

    // Create validation that ignores exp field
    let mut validation = Validation::default();
    validation.validate_exp = false;

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    )
    .map(|token_data| token_data.claims)
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::InvalidToken
        | jsonwebtoken::errors::ErrorKind::InvalidSignature => AppError::InvalidToken,
        _ => AppError::InternalError(format!("Token decoding error: {e}")),
    })
}

/// Parse duration string to seconds
///
/// Accepts the following formats:
/// - "30s" - 30 seconds
/// - "10m" - 10 minutes
/// - "12h" - 12 hours
/// - "7d" - 7 days
///
/// # Returns
/// Some(seconds) if parsing was successful, None otherwise
fn parse_duration_to_seconds(duration_str: &str) -> Option<i64> {
    let len = duration_str.len();
    if len < 2 {
        return None;
    }

    let (value_str, unit) = duration_str.split_at(len - 1);

    let Ok(value) = value_str.parse::<i64>() else {
        return None;
    };

    match unit {
        "s" => Some(value),         // seconds
        "m" => Some(value * 60),    // minutes to seconds
        "h" => Some(value * 3600),  // hours to seconds
        "d" => Some(value * 86400), // days to seconds
        _ => None,
    }
}
