use crate::models::error::AppError;
use serde::Deserialize;
use std::env;

#[derive(Deserialize)]
struct RecaptchaResponse {
    pub success: bool,
    pub _score: Option<f32>, // Only available for v3
    #[serde(rename = "error-codes")]
    pub error_codes: Option<Vec<String>>,
}

/// Verify a reCAPTCHA token with Google's API
pub async fn verify_recaptcha(token: &str) -> Result<bool, AppError> {
    let secret_key = env::var("RECAPTCHA_SECRET_KEY")
        .unwrap_or_else(|_| "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe".to_string()); // Google's test key

    // If using the test key, return true for testing purposes
    if secret_key == "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe" {
        log::info!("Using Google's test reCAPTCHA key - verification automatically passing");
        return Ok(true);
    }

    let client = reqwest::Client::new();
    let params = [("secret", secret_key), ("response", token.to_string())];

    let res = client
        .post("https://www.google.com/recaptcha/api/siteverify")
        .form(&params)
        .send()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to verify reCAPTCHA: {e}")))?;

    let response: RecaptchaResponse = res
        .json()
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to parse reCAPTCHA response: {e}")))?;

    if !response.success {
        let errors = response.error_codes.unwrap_or_default().join(", ");
        log::warn!("reCAPTCHA verification failed: {}", errors);

        if errors.is_empty() {
            return Err(AppError::CaptchaVerificationFailed(
                "Verification failed".to_string(),
            ));
        }

        return Err(AppError::CaptchaVerificationFailed(errors));
    }

    Ok(true)
}
