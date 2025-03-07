use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] mongodb::error::Error),
    
    #[error("User not found")]
    UserNotFound,
    
    #[error("Session not found")]
    SessionNotFound,
    
    #[error("User already exists")]
    UserAlreadyExists,
    
    #[error("Invalid credentials")]
    InvalidCredentials,
    
    #[error("Session is already full")]
    SessionFull,
    
    #[error("Session is not in the correct state")]
    InvalidSessionState,
    
    #[error("User is already in the session")]
    UserAlreadyInSession,
    
    #[error("Authentication error: {0}")]
    AuthError(String),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    #[error("Internal server error: {0}")]
    InternalError(String),
}
