use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "PascalCase")]
pub enum TokenPurpose {
    EmailVerification,
    PasswordReset,
}

impl ToString for TokenPurpose {
    fn to_string(&self) -> String {
        match self {
            TokenPurpose::EmailVerification => "EmailVerification".to_string(),
            TokenPurpose::PasswordReset => "PasswordReset".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoredTokenMetadata {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: ObjectId,
    pub token_jti: String,
    pub purpose: String,
    pub expires_at: DateTime,
    pub created_at: DateTime,
}

impl StoredTokenMetadata {
    /// Create a new token metadata from a JWT token's claims
    pub fn from_claims(
        user_id: ObjectId,
        token_jti: String,
        purpose: String,
        exp_seconds: usize,
    ) -> Self {
        let now = mongodb::bson::DateTime::now();

        // Convert expiration timestamp from seconds to milliseconds for MongoDB DateTime
        let exp_millis = (exp_seconds as i64) * 1000;
        let expires_at = mongodb::bson::DateTime::from_millis(exp_millis);

        Self {
            id: ObjectId::new(),
            user_id,
            token_jti,
            purpose,
            expires_at,
            created_at: now,
        }
    }
}
