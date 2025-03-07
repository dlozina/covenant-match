use mongodb::Database;
use crate::models::session::{GameSession, CreateSessionDto, JoinSessionDto, SubmitResultDto, SessionStatus, SessionResponseDto, PlayerInfo, SessionResult, GameResult};
use crate::models::error::AppError;
use crate::repository::{session_repository, user_repository, statistics_repository};
use chrono::Utc;
use uuid::Uuid;
use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;

pub async fn create_session(db: &Database, session_data: CreateSessionDto) -> Result<SessionResponseDto, AppError> {
    // Verify user exists
    let user = user_repository::find_by_id(db, &session_data.host_id).await?
        .ok_or(AppError::UserNotFound)?;
    
    // Generate session password (6 alphanumeric characters)
    let password: String = thread_rng()
        .sample_iter(&Alphanumeric)
        .take(6)
        .map(char::from)
        .collect();
    
    let now = Utc::now();
    let session = GameSession {
        id: Uuid::new_v4().to_string(),
        host_id: session_data.host_id,
        password,
        character: session_data.character,
        status: SessionStatus::Open,
        joined_players: vec![
            PlayerInfo {
                user_id: user.id.clone(),
                username: user.username.clone(),
                character: session_data.character.clone(),
                joined_at: now,
            }
        ],
        results: vec![],
        created_at: now,
        updated_at: now,
        started_at: None,
        completed_at: None,
    };
    
    // Save the session to the database
    session_repository::create_session(db, &session).await?;
    
    // Convert to response DTO
    let mut response = SessionResponseDto::from(session);
    response.password = Some(response.id.clone());
    
    Ok(response)
}

pub async fn get_sessions(db: &Database, status: Option<String>) -> Result<Vec<SessionResponseDto>, AppError> {
    let status_filter = match status {
        Some(s) => {
            match s.to_lowercase().as_str() {
                "open" => Some(SessionStatus::Open),
                "full" => Some(SessionStatus::Full),
                "in_progress" => Some(SessionStatus::InProgress),
                "completed" => Some(SessionStatus::Completed),
                "cancelled" => Some(SessionStatus::Cancelled),
                _ => None,
            }
        },
        None => None,
    };
    
    let sessions = session_repository::find_sessions(db, status_filter).await?;
    
    Ok(sessions.into_iter().map(SessionResponseDto::from).collect())
}

pub async fn get_session_by_id(db: &Database, session_id: &str) -> Result<Option<SessionResponseDto>, AppError> {
    let session = session_repository::find_by_id(db, session_id).await?;
    
    Ok(session.map(SessionResponseDto::from))
}

pub async fn join_session(db: &Database, session_id: &str, join_data: JoinSessionDto) -> Result<SessionResponseDto, AppError> {
    // Verify user exists
    let _user = user_repository::find_by_id(db, &join_data.user_id).await?
        .ok_or(AppError::UserNotFound)?;
    
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id).await?
        .ok_or(AppError::SessionNotFound)?;
    
    // Check if session is open
    if session.status != SessionStatus::Open {
        return Err(AppError::InvalidSessionState);
    }
    
    // Check if user is already in the session
    if session.joined_players.iter().any(|p| p.user_id == join_data.user_id) {
        return Err(AppError::UserAlreadyInSession);
    }
    
    // Check if session is already full (max 3 players)
    if session.joined_players.len() >= 3 {
        return Err(AppError::SessionFull);
    }
    
    // Add player to session
    let now = Utc::now();
    session.joined_players.push(PlayerInfo {
        user_id: join_data.user_id,
        username: join_data.username,
        character: join_data.character,
        joined_at: now,
    });
    
    // Update session status if it's now full
    if session.joined_players.len() >= 3 {
        session.status = SessionStatus::Full;
    }
    
    session.updated_at = now;
    
    // Update the session in the database
    session_repository::update_session(db, &session).await?;
    
    // Create response DTO
    let mut response = SessionResponseDto::from(session);
    
    // Include password if session is full
    if response.status == SessionStatus::Full {
        response.password = Some(response.id.clone());
    }
    
    Ok(response)
}

pub async fn start_session(db: &Database, session_id: &str) -> Result<SessionResponseDto, AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id).await?
        .ok_or(AppError::SessionNotFound)?;
    
    // Check if session can be started
    if session.status != SessionStatus::Full {
        return Err(AppError::InvalidSessionState);
    }
    
    // Update session status
    let now = Utc::now();
    session.status = SessionStatus::InProgress;
    session.started_at = Some(now);
    session.updated_at = now;
    
    // Update the session in the database
    session_repository::update_session(db, &session).await?;
    
    Ok(SessionResponseDto::from(session))
}

pub async fn submit_result(db: &Database, session_id: &str, result_data: SubmitResultDto) -> Result<(), AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id).await?
        .ok_or(AppError::SessionNotFound)?;
    
    // Check if session is in progress
    if session.status != SessionStatus::InProgress {
        return Err(AppError::InvalidSessionState);
    }
    
    // Check if user is part of the session
    let player = session.joined_players.iter()
        .find(|p| p.user_id == result_data.user_id)
        .ok_or(AppError::UserNotFound)?;
    
    // Add the result
    let now = Utc::now();
    session.results.push(SessionResult {
        user_id: result_data.user_id,
        result: result_data.result,
        submitted_at: now,
    });
    
    session.updated_at = now;
    
    // Check if all players have submitted results
    if session.results.len() >= session.joined_players.len() {
        // Check for result consensus
        let win_count = session.results.iter().filter(|r| r.result == GameResult::Win).count();
        let loss_count = session.results.iter().filter(|r| r.result == GameResult::Loss).count();
        let disconnect_count = session.results.iter().filter(|r| r.result == GameResult::Disconnect).count();
        
        // If there's consensus (majority agreement), mark session as completed
        if win_count > 1 || loss_count > 1 || disconnect_count > 1 {
            session.status = SessionStatus::Completed;
            session.completed_at = Some(now);
            
            // Update player statistics
            for player in &session.joined_players {
                // Get player's submitted result or use majority result
                let player_result = session.results.iter()
                    .find(|r| r.user_id == player.user_id)
                    .map(|r| r.result.clone())
                    .unwrap_or_else(|| {
                        if win_count > 1 {
                            GameResult::Win
                        } else if loss_count > 1 {
                            GameResult::Loss
                        } else {
                            GameResult::Disconnect
                        }
                    });
                
                // Update statistics for this player
                statistics_repository::update_player_stats(
                    db,
                    &player.user_id,
                    &player.username,
                    &player.character,
                    &player_result,
                ).await?;
            }
        }
    }
    
    // Update the session in the database
    session_repository::update_session(db, &session).await?;
    
    Ok(())
}
