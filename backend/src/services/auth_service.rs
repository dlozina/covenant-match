use crate::models::auth::{CaptchaConfig, LoginAttempt};
use crate::models::error::AppError;
use crate::repository::auth_repository;
use crate::utils::recaptcha;
use mongodb::Database;
use std::env;

/// Get the CAPTCHA configuration from environment or use defaults
pub fn get_captcha_config() -> CaptchaConfig {
    let attempts_threshold = env::var("CAPTCHA_ATTEMPTS_THRESHOLD")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3);

    let window_minutes = env::var("CAPTCHA_WINDOW_MINUTES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(30);

    CaptchaConfig {
        attempts_threshold,
        window_minutes,
    }
}

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

/// Check if a CAPTCHA is required for this login attempt
pub async fn is_captcha_required(
    db: &Database,
    username: &str,
    ip_address: &str,
) -> Result<bool, AppError> {
    let config = get_captcha_config();
    auth_repository::should_require_captcha(
        db,
        username,
        ip_address,
        config.attempts_threshold,
        config.window_minutes,
    )
    .await
}

/// Verify CAPTCHA token if required for this login attempt
/// Returns Ok(()) if:
/// - CAPTCHA is not required, or
/// - CAPTCHA is required and the token is valid
pub async fn verify_captcha_if_required(
    db: &Database,
    username: &str,
    ip_address: &str,
    captcha_token: Option<&str>,
) -> Result<(), AppError> {
    // Check if CAPTCHA is required
    let captcha_required = is_captcha_required(db, username, ip_address).await?;

    if captcha_required {
        // If required, we must have a token
        match captcha_token {
            Some(token) => {
                // Verify the token
                recaptcha::verify_recaptcha(token).await?;
                Ok(())
            }
            None => {
                // No token provided but CAPTCHA is required
                Err(AppError::CaptchaRequired(
                    "CAPTCHA verification required due to multiple failed login attempts"
                        .to_string(),
                ))
            }
        }
    } else {
        // CAPTCHA not required, proceed normally
        Ok(())
    }
}

/// Clean up old login attempt records
pub async fn cleanup_old_attempts(db: &Database) -> Result<u64, AppError> {
    // Default retention period is 30 days
    let retention_days = env::var("LOGIN_ATTEMPTS_RETENTION_DAYS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(30);

    auth_repository::cleanup_old_attempts(db, retention_days).await
}

/// Get recent login attempts for admin dashboard or auditing
pub async fn get_recent_attempts(db: &Database, limit: i64) -> Result<Vec<LoginAttempt>, AppError> {
    auth_repository::get_recent_attempts(db, limit).await
}
