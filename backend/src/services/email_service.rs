use crate::{config::get_config, utils};
use log::{error, info};
use reqwest::Client;
use serde_json::{json, Value};

/// Send a verification email to the user
pub async fn send_verification_email(
    user_email: &str,
    email_verification_token: &str,
) -> Result<(), String> {
    let config = get_config();
    let client = Client::new();

    let verification_url = format!(
        "{}/verify?token={}",
        config.email_frontend_url(),
        email_verification_token
    );

    let api_key = utils::secrets::read_secret_without_default("mailersend_api_key");

    // Get email sender information from config with fallbacks
    let email_from = config.email_from().unwrap_or("noreply@covenant-match.com");

    let sender_name = config.email_sender_name().unwrap_or("Covenant Match");

    // Prepare the email payload
    let payload = json!({
        "from": {
            "email": email_from,
            "name": sender_name
        },
        "to": [
            {
                "email": user_email,
                "name": user_email // Using email as name if actual name is not available
            }
        ],
        "subject": "Verify Your Email Address",
        "text": format!("Please verify your email address by clicking on the following link: {}", verification_url),
        "html": format!("<p>Please verify your email address by clicking on the following link:</p><p><a href=\"{}\">Verify Email</a></p>", verification_url),
        "personalization": [
            {
                "email": user_email,
                "data": {
                    "verification_url": verification_url
                }
            }
        ]
    });
    log::info!("Sending verification email to {user_email}");
    // Send the request to MailerSend API
    let response = client
        .post(config.email_mailersend_url())
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send email request: {e}"))?;

    // Check the response status
    let status = response.status();

    if status.is_success() {
        // For status code 202 Accepted, the email was queued successfully
        info!("Email sent successfully to {user_email}");
        Ok(())
    } else {
        // Handle error responses
        let error_body = response
            .text()
            .await
            .unwrap_or_else(|_| "Could not read error response".to_string());

        error!(
            "Failed to send email. Status: {}, Body: {}",
            status, error_body
        );
        Err(format!("Failed to send email: {status} - {error_body}"))
    }
}

/// Send a reset password email to the user
pub async fn send_reset_password_email(
    user_email: &str,
    reset_password_token: &str,
) -> Result<(), String> {
    let config = get_config();
    let client = Client::new();

    let reset_password_url = format!(
        "{}/reset-password?token={}",
        config.email_frontend_url(),
        reset_password_token
    );

    let api_key = utils::secrets::read_secret_without_default("mailersend_api_key");

    // Get email sender information from config with fallbacks
    let email_from = config.email_from().unwrap_or("noreply@covenant-match.com");

    let sender_name = config.email_sender_name().unwrap_or("Covenant Match");

    // Prepare the email payload
    let payload = json!({
        "from": {
            "email": email_from,
            "name": sender_name
        },
        "to": [
            {
                "email": user_email,
                "name": user_email // Using email as name if actual name is not available
            }
        ],
        "subject": "Reset Your Password",
        "text": format!("Please reset your password by clicking on the following link: {}", reset_password_url),
        "html": format!("<p>Please reset your password by clicking on the following link:</p><p><a href=\"{}\">Reset Password</a></p>", reset_password_url),
        "personalization": [
            {
                "email": user_email,
                "data": {
                    "reset_password_url": reset_password_url
                }
            }
        ]
    });

    log::info!("Sending reset password email to {user_email}");
    // Send the request to MailerSend API
    let response = client
        .post(config.email_mailersend_url())
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {api_key}"))
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send email request: {e}"))?;

    let status = response.status();

    if status.is_success() {
        info!("Email sent successfully to {user_email}");
        Ok(())
    } else {
        let error_body = response
            .text()
            .await
            .unwrap_or_else(|_| "Could not read error response".to_string());

        error!(
            "Failed to send email. Status: {}, Body: {}",
            status, error_body
        );
        Err(format!("Failed to send email: {status} - {error_body}"))
    }
}
