use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

/// Structure to track login attempts for security measures
/// Stored in MongoDB to enforce CAPTCHA requirements
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginAttempt {
    #[serde(rename = "_id")]
    pub id: String,
    /// Username that was attempted
    pub username: String,
    /// IP address of the request
    pub ip_address: String,
    /// When the attempt was made
    pub created_at: DateTime<Utc>,
    /// Whether this was a successful login
    pub successful: bool,
}

impl LoginAttempt {
    /// Create a new login attempt record
    pub fn new(username: String, ip_address: String, successful: bool) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            username,
            ip_address,
            created_at: Utc::now(),
            successful,
        }
    }

    /// Check if this attempt is within the relevant time window
    pub fn is_recent(&self, window_minutes: i64) -> bool {
        let window = Utc::now() - Duration::minutes(window_minutes);
        self.created_at >= window
    }
}

/// Configuration for CAPTCHA security settings
pub struct CaptchaConfig {
    /// Number of failed attempts before CAPTCHA is required
    pub attempts_threshold: usize,
    /// Time window in minutes to count failed attempts
    pub window_minutes: i64,
}

impl Default for CaptchaConfig {
    fn default() -> Self {
        Self {
            attempts_threshold: 3,
            window_minutes: 30,
        }
    }
}
