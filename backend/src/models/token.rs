use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum TokenPurpose {
    EmailVerification,
    PasswordReset,
}

impl ToString for TokenPurpose {
    fn to_string(&self) -> String {
        match self {
            TokenPurpose::EmailVerification => "email_verification".to_string(),
            TokenPurpose::PasswordReset => "password_reset".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Token {
    pub id: ObjectId,
    pub user_id: ObjectId,
    pub token: String,
    pub purpose: TokenPurpose,
    pub expires_at: DateTime,
    pub created_at: DateTime,
}
