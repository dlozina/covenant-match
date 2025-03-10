use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::env;

use crate::models::error::AppError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,         // Subject (user ID)
    pub role: String,        // Role: "admin" or "user"
    pub exp: usize,          // Expiration time (as UTC timestamp)
    pub iat: usize,          // Issued at (as UTC timestamp)
}

// Generate a JWT for a user
pub fn generate_token(user_id: &str, role: &str) -> Result<String, AppError> {
    let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "default_secret_change_in_production".to_string());
    
    // Set token expiration (24 hours from now)
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp() as usize;
    
    let issued_at = Utc::now().timestamp() as usize;
    
    let claims = Claims {
        sub: user_id.to_owned(),
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
    let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "default_secret_change_in_production".to_string());
    
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