use chrono::{Duration, TimeZone, Utc};
use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

/// Structure to track login attempts for security measures
/// Stored in `MongoDB` to enforce CAPTCHA requirements
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoginAttempt {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    /// Username that was attempted
    pub username: String,
    /// IP address of the request
    pub ip_address: String,
    /// When the attempt was made
    pub created_at: DateTime,
    /// Whether this was a successful login
    pub successful: bool,
}

impl LoginAttempt {
    /// Create a new login attempt record
    pub fn new(username: String, ip_address: String, successful: bool) -> Self {
        Self {
            id: ObjectId::new(),
            username,
            ip_address,
            created_at: DateTime::now(),
            successful,
        }
    }

    /// Check if this attempt is within the relevant time window
    pub fn is_recent(&self, window_minutes: i64) -> bool {
        let window = Utc::now() - Duration::minutes(window_minutes);

        // Convert MongoDB DateTime to chrono DateTime for comparison
        // MongoDB DateTime internally stores time as milliseconds since the Unix epoch
        let millis = self.created_at.timestamp_millis();
        let attempt_time = Utc
            .timestamp_millis_opt(millis)
            .single()
            .unwrap_or(Utc::now());

        attempt_time >= window
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
