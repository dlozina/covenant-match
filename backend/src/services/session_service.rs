use crate::models::error::AppError;
use crate::models::session::{
    CreateSessionDto, GameResult, GameSession, JoinSessionDto, PlayerInfo, RateSessionDto,
    SessionResponseDto, SessionResult, SessionStatus, SubmitResultDto,
};
use crate::repository::{session_repository, statistics_repository, user_repository};
use chrono::Utc;
use mongodb::Database;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use uuid::Uuid;

pub async fn create_session(
    db: &Database,
    user_id: &str,
    session_data: CreateSessionDto,
) -> Result<SessionResponseDto, AppError> {
    
    // Verify host user exists
    let user = user_repository::find_user_by_id(db, &user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    let now = Utc::now();
    let session = GameSession {
        id: Uuid::new_v4().to_string(),
        host_id: user_id.to_string(),
        password: session_data.game_password,
        status: SessionStatus::Open,
        joined_players: vec![PlayerInfo {
            user_id: user.id.clone(),
            username: user.display_name.unwrap_or(user.username),
            nightfarer: session_data.nightfarer,
            joined_at: now,
        }],
        night_lord: session_data.night_lord,
        results: vec![],
        ratings: vec![],
        created_at: now,
        updated_at: now,
        started_at: None,
        completed_at: None,
    };

    // Save the session to the database
    session_repository::create_session(db, &session).await?;

    // Convert to response DTO
    let response = SessionResponseDto::from(session);

    Ok(response)
}

pub async fn get_sessions(
    db: &Database,
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Result<Vec<SessionResponseDto>, AppError> {
    let status_filter = match status {
        Some(s) => match s.to_lowercase().as_str() {
            "open" => Some(SessionStatus::Open),
            "full" => Some(SessionStatus::Full),
            "in_progress" => Some(SessionStatus::InProgress),
            "completed" => Some(SessionStatus::Completed),
            "cancelled" => Some(SessionStatus::Cancelled),
            _ => None,
        },
        None => None,
    };

    let sessions = session_repository::find_sessions(db, status_filter, limit, offset).await?;

    // Convert to response DTOs (exclude passwords for listing)
    Ok(sessions
        .into_iter()
        .map(|s| {
            let mut response = SessionResponseDto::from(s);
            response.password = None; // Don't include password in listings
            response
        })
        .collect())
}

pub async fn get_session_by_id(
    db: &Database,
    session_id: &str,
    user_id: Option<&str>,
) -> Result<Option<SessionResponseDto>, AppError> {
    let session = session_repository::find_by_id(db, session_id).await?;

    // Convert to response DTO
    Ok(session.map(|s| {
        let mut response = SessionResponseDto::from(s);

        // Only include password if user is a participant
        if let Some(user_id) = user_id {
            if !response.joined_players.iter().any(|p| p.user_id == user_id) {
                response.password = None;
            }
        } else {
            response.password = None;
        }

        response
    }))
}

pub async fn join_session(
    db: &Database,
    session_id: &str,
    join_data: JoinSessionDto,
) -> Result<SessionResponseDto, AppError> {
    // Verify user exists
    let user_id = join_data.user_id.clone();

    let user = user_repository::find_user_by_id(db, &user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    // Get the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if session is open
    if session.status != SessionStatus::Open {
        return Err(AppError::BadRequest(
            "Session is not open for joining".to_string(),
        ));
    }

    // Check if user is already in the session
    if session.joined_players.iter().any(|p| p.user_id == user_id) {
        return Err(AppError::BadRequest(
            "User is already in this session".to_string(),
        ));
    }

    // Check if session is already full (max 3 players)
    if session.joined_players.len() >= 3 {
        return Err(AppError::BadRequest("Session is full".to_string()));
    }

    // Add player to session
    let now = Utc::now();
    session.joined_players.push(PlayerInfo {
        user_id: user_id.clone(),
        username: user.display_name.unwrap_or(user.username),
        nightfarer: join_data.nightfarer,
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

    // Always include password for participant
    response.password = Some(response.password.unwrap_or_default());

    Ok(response)
}

pub async fn start_session(
    db: &Database,
    session_id: &str,
    user_id: &str,
) -> Result<SessionResponseDto, AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if user is the host
    if session.host_id != user_id {
        return Err(AppError::Forbidden(
            "Only the host can start the session".to_string(),
        ));
    }

    // Check if session can be started (must be Full)
    if session.status != SessionStatus::Full {
        return Err(AppError::BadRequest(
            "Session must be full before it can be started".to_string(),
        ));
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

pub async fn cancel_session(
    db: &Database,
    session_id: &str,
    user_id: &str,
) -> Result<(), AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if user is the host
    if session.host_id != user_id {
        return Err(AppError::Forbidden(
            "Only the host can cancel the session".to_string(),
        ));
    }

    // Check if session can be cancelled (must not be Completed or already Cancelled)
    if session.status == SessionStatus::Completed || session.status == SessionStatus::Cancelled {
        return Err(AppError::BadRequest(
            "Session cannot be cancelled in its current state".to_string(),
        ));
    }

    // Update session status
    let now = Utc::now();
    session.status = SessionStatus::Cancelled;
    session.updated_at = now;

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    Ok(())
}

pub async fn submit_result(
    db: &Database,
    session_id: &str,
    result_data: SubmitResultDto,
) -> Result<(), AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if session is in progress
    if session.status != SessionStatus::InProgress {
        return Err(AppError::BadRequest(
            "Results can only be submitted for in-progress sessions".to_string(),
        ));
    }

    // Get user ID from result data
    let user_id = result_data.user_id.clone();

    // Check if user is part of the session
    if !session.joined_players.iter().any(|p| p.user_id == user_id) {
        return Err(AppError::Forbidden(
            "Only session participants can submit results".to_string(),
        ));
    }

    // Check if user has already submitted a result
    if session.results.iter().any(|r| r.user_id == user_id) {
        return Err(AppError::BadRequest(
            "User has already submitted a result for this session".to_string(),
        ));
    }

    // Add the result
    let now = Utc::now();
    session.results.push(SessionResult {
        user_id,
        result: result_data.result,
        submitted_at: now,
    });

    session.updated_at = now;

    // Check if all players have submitted results
    if session.results.len() >= session.joined_players.len() {
        // Check for result consensus
        let win_count = session
            .results
            .iter()
            .filter(|r| r.result == GameResult::Win)
            .count();
        let loss_count = session
            .results
            .iter()
            .filter(|r| r.result == GameResult::Loss)
            .count();
        let disconnect_count = session
            .results
            .iter()
            .filter(|r| r.result == GameResult::Disconnect)
            .count();

        // If there's consensus (majority agreement), mark session as completed
        if win_count > 1 || loss_count > 1 || disconnect_count > 1 {
            session.status = SessionStatus::Completed;
            session.completed_at = Some(now);

            // Update player statistics
            for player in &session.joined_players {
                // Get player's submitted result or use majority result
                let player_result = session
                    .results
                    .iter()
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
                    &player.nightfarer,
                    &player_result,
                )
                .await?;
            }
        }
    }

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    Ok(())
}

pub async fn get_session_results(
    db: &Database,
    session_id: &str,
    user_id: &str,
) -> Result<serde_json::Value, AppError> {
    // Get the session
    let session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if user is part of the session
    if !session.joined_players.iter().any(|p| p.user_id == user_id) {
        return Err(AppError::Forbidden(
            "Only session participants can view results".to_string(),
        ));
    }

    // Calculate consensus status
    let win_count = session
        .results
        .iter()
        .filter(|r| r.result == GameResult::Win)
        .count();
    let loss_count = session
        .results
        .iter()
        .filter(|r| r.result == GameResult::Loss)
        .count();
    let disconnect_count = session
        .results
        .iter()
        .filter(|r| r.result == GameResult::Disconnect)
        .count();

    let consensus_result = if win_count > 1 {
        Some("win")
    } else if loss_count > 1 {
        Some("loss")
    } else if disconnect_count > 1 {
        Some("disconnect")
    } else {
        None
    };

    // Prepare results response
    let response = serde_json::json!({
        "sessionId": session.id,
        "status": session.status,
        "results": session.results,
        "consensus": {
            "hasConsensus": consensus_result.is_some(),
            "result": consensus_result,
            "submittedCount": session.results.len(),
            "totalPlayers": session.joined_players.len()
        },
        "completed": session.status == SessionStatus::Completed
    });

    Ok(response)
}

pub async fn rate_session(
    db: &Database,
    session_id: &str,
    rating_data: RateSessionDto,
) -> Result<(), AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if session is completed
    if session.status != SessionStatus::Completed {
        return Err(AppError::BadRequest(
            "Only completed sessions can be rated".to_string(),
        ));
    }

    // Get user ID from rating data
    let user_id = match &rating_data.user_id {
        Some(id) => id.clone(),
        None => return Err(AppError::BadRequest("User ID is required".to_string())),
    };

    // Check if user is part of the session
    if !session.joined_players.iter().any(|p| p.user_id == user_id) {
        return Err(AppError::Forbidden(
            "Only session participants can rate the session".to_string(),
        ));
    }

    // Check if user has already rated the session
    if session.ratings.iter().any(|r| match &r.user_id {
        Some(id) => id == &user_id,
        None => false,
    }) {
        return Err(AppError::BadRequest(
            "User has already rated this session".to_string(),
        ));
    }

    // Add the rating
    let now = Utc::now();

    // Create a new rating with the proper user_id type
    let mut session_rating = rating_data;
    session_rating.user_id = Some(user_id.clone()); // Ensure it's a String

    session.ratings.push(session_rating);
    session.updated_at = now;

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    Ok(())
}
