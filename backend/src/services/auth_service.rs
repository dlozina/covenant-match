use crate::models::error::AppError;
use crate::repository::auth_repository;
use crate::{models::auth::LoginAttempt, utils::secrets};
use mongodb::Database;
use serde::{Deserialize, Serialize};
use std::env;

/// Record a login attempt (successful or failed) for tracking purposes
pub async fn record_login_attempt(
    db: &Database,
    username: &str,
    ip_address: &str,
    successful: bool,
) -> Result<(), AppError> {
    let attempt = LoginAttempt::new(username.to_string(), ip_address.to_string(), successful);
    auth_repository::add_login_attempt(db, &attempt).await
}

/// Get recent login attempts for admin dashboard or auditing
pub async fn get_recent_attempts(db: &Database, limit: i64) -> Result<Vec<LoginAttempt>, AppError> {
    auth_repository::get_recent_attempts(db, limit).await
}

#[derive(Serialize)]
struct TurnstileRequest<'a> {
    secret: &'a str,
    response: &'a str,
    remoteip: &'a str,
}

#[derive(Deserialize)]
struct TurnstileResponse {
    success: bool,
    // Optionally, include more fields as needed from the API response
}

pub async fn verify_turnstile_token(
    db: &Database,
    username: &str,
    ip_address: &str,
    turnstile_token: Option<&str>,
) -> Result<(), AppError> {
    let secret_key = secrets::read_secret(
        "turnstile_secret_key",
        "1x0000000000000000000000000000000AA",
    );

    // If using the test key, return true for testing purposes
    if secret_key == "1x0000000000000000000000000000000AA" {
        log::info!("Using Cloudflare Turnstile test key - verification automatically passing");
        return Ok(());
    }

    // Check if token is provided
    let token = turnstile_token
        .ok_or_else(|| AppError::CaptchaRequired("Turnstile token is required".to_string()))?;

    let client = reqwest::Client::new();

    let url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    let payload = TurnstileRequest {
        secret: &secret_key,
        response: token,
        remoteip: ip_address,
    };

    let response =
        client.post(url).json(&payload).send().await.map_err(|e| {
            AppError::InternalError(format!("Failed to verify Turnstile token: {e}"))
        })?;

    let body: TurnstileResponse = response
        .json()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to parse Turnstile response: {e}")))?;

    if !body.success {
        record_login_attempt(db, username, ip_address, false).await?;
        return Err(AppError::CaptchaVerificationFailed(
            "Turnstile token verification failed".to_string(),
        ));
    }

    record_login_attempt(db, username, ip_address, true).await?;

    log::info!("Turnstile token verification passed");

    Ok(())
}

