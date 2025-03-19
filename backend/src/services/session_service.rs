use crate::models::error::AppError;
use crate::models::session::{
    CreateSessionDto, GameResult, GameSession, JoinSessionDto, PlayerInfo, RateSessionDto,
    SessionResponseDto, SessionResult, SessionStatus, SubmitResultDto,
};
use crate::repository::{session_repository, statistics_repository, user_repository};
use crate::sse::messages::{BroadcastMessage, ServerMessage as SseServerMessage};
use crate::sse::session::SessionManager as SseSessionManager;
use crate::ws::messages::{Broadcast, ServerMessage as WsServerMessage};
use crate::ws::SessionManager as WsSessionManager;
use actix::prelude::*;
use chrono::Utc;
use mongodb::Database;
use rand::distributions::Alphanumeric;
use rand::{thread_rng, Rng};
use serde_json::json;
use std::sync::LazyLock;
use std::sync::Mutex;
use uuid::Uuid;

// Global session manager references
static WS_SESSION_MANAGER: LazyLock<Mutex<Option<Addr<WsSessionManager>>>> =
    LazyLock::new(|| Mutex::new(None));

static SSE_SESSION_MANAGER: LazyLock<Mutex<Option<Addr<SseSessionManager>>>> =
    LazyLock::new(|| Mutex::new(None));

// Function to set the WebSocket session manager
pub fn set_session_manager(addr: Addr<WsSessionManager>) {
    let mut manager = WS_SESSION_MANAGER.lock().unwrap();
    *manager = Some(addr);
}

// Function to set the SSE session manager
pub fn set_sse_session_manager(addr: Addr<SseSessionManager>) {
    let mut manager = SSE_SESSION_MANAGER.lock().unwrap();
    *manager = Some(addr);
}

// Function to get the WebSocket session manager
pub fn get_session_manager() -> Option<Addr<WsSessionManager>> {
    let manager = WS_SESSION_MANAGER.lock().unwrap();
    manager.clone()
}

// Function to get the SSE session manager
pub fn get_sse_session_manager() -> Option<Addr<SseSessionManager>> {
    let manager = SSE_SESSION_MANAGER.lock().unwrap();
    manager.clone()
}

// Helper function to broadcast to both WebSocket and SSE clients
pub fn broadcast_event(
    session_id: &str,
    event_type: &str,
    data: serde_json::Value,
    exclude_client_id: Option<String>,
) {
    // Log the broadcast event
    log::info!(
        "Broadcasting event: type={}, session={}, data={}, exclude={}",
        event_type,
        session_id,
        data,
        exclude_client_id
            .clone()
            .unwrap_or_else(|| "none".to_string())
    );

    // Get current timestamp
    let now = chrono::Utc::now().timestamp();

    // Broadcast to WebSocket clients
    if let Some(ws_manager) = get_session_manager() {
        log::debug!("Broadcasting to WebSocket clients");
        let message = WsServerMessage {
            message_type: event_type.to_string(),
            data: data.clone(),
        };

        let broadcast = Broadcast {
            session_id: session_id.to_string(),
            message,
            exclude_client_id: exclude_client_id.clone(),
        };

        // Send the broadcast message
        ws_manager.do_send(broadcast);
    } else {
        log::warn!("WebSocket session manager not available for broadcasting");
    }

    // Broadcast to SSE clients
    match get_sse_session_manager() {
        Some(sse_manager) => {
            log::debug!("Broadcasting to SSE clients - manager found");
            let message = SseServerMessage {
                message_type: event_type.to_string(),
                data: data.clone(),
                timestamp: now,
            };

            let broadcast = BroadcastMessage {
                session_id: session_id.to_string(),
                message,
                exclude_client: exclude_client_id,
            };

            // Send the broadcast message
            log::debug!("Sending BroadcastMessage to SSE manager");

            // Use do_send which doesn't wait for a response
            sse_manager.do_send(broadcast);

            // Log success
            log::debug!("BroadcastMessage sent to SSE manager");
        }
        None => {
            log::error!("SSE session manager not available for broadcasting - get_sse_session_manager() returned None");

            // Try to reinitialize the SSE session manager if it's not available
            if let Some(ws_manager) = get_session_manager() {
                log::warn!("Attempting to reinitialize SSE session manager");
                // Create a new SSE session manager and start it as an actor
                let new_sse_manager = SseSessionManager::new(ws_manager.clone()).start();

                // Set the new SSE session manager
                set_sse_session_manager(new_sse_manager.clone());

                // Try broadcasting again with the new manager
                let message = SseServerMessage {
                    message_type: event_type.to_string(),
                    data: data.clone(),
                    timestamp: now,
                };

                let broadcast = BroadcastMessage {
                    session_id: session_id.to_string(),
                    message,
                    exclude_client: exclude_client_id,
                };

                // Send the broadcast message
                log::debug!("Sending BroadcastMessage to newly initialized SSE manager");
                new_sse_manager.do_send(broadcast);
                log::debug!("BroadcastMessage sent to newly initialized SSE manager");
            } else {
                log::error!(
                    "Cannot reinitialize SSE session manager: WebSocket manager not available"
                );
            }
        }
    }
}

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
        name: session_data.name,
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
        let response = SessionResponseDto::from(s);

        // Only include password if user is a participant
        if let Some(user_id) = user_id {
            if !response.joined_players.iter().any(|p| p.user_id == user_id) {}
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

    // Get the username and nightfarer for broadcasting
    let username = user.display_name.clone().unwrap_or(user.username.clone());
    let nightfarer = join_data.nightfarer.clone();

    // Add player to session
    let now = Utc::now();
    session.joined_players.push(PlayerInfo {
        user_id: user_id.clone(),
        username,
        nightfarer: nightfarer.clone(),
        joined_at: now,
    });

    // Update session status if it's now full
    if session.joined_players.len() >= 3 {
        session.status = SessionStatus::Full;
    }

    session.updated_at = now;

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    // Broadcast join event to all clients in the session
    broadcast_event(
        session_id,
        "join",
        json!({
            "userId": user_id,
            "username": user.display_name.unwrap_or(user.username),
            "nightfarer": nightfarer,
            "sessionId": session_id
        }),
        Some(user_id.clone()),
    );

    // Create response DTO
    let response = SessionResponseDto::from(session);

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

    broadcast_event(
        session_id,
        "start",
        json!({
            "sessionId": session_id,
            "userId": session.host_id,
            "sessionStatus": session.status
        }),
        Some(session.host_id.clone()),
    );

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

pub async fn complete_session(
    db: &Database,
    session_id: &str,
    user_id: &str,
    duration: Option<i64>,
) -> Result<SessionResponseDto, AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if user is the host
    if session.host_id != user_id {
        return Err(AppError::Forbidden(
            "Only the host can complete the session".to_string(),
        ));
    }

    // Check if session can be completed (must be InProgress)
    if session.status != SessionStatus::InProgress {
        return Err(AppError::BadRequest(
            "Only in-progress sessions can be completed".to_string(),
        ));
    }

    // Update session status
    let now = Utc::now();
    session.status = SessionStatus::Completed;
    session.completed_at = Some(now);
    session.updated_at = now;

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    broadcast_event(
        session_id,
        "complete",
        json!({
            "sessionId": session_id,
            "userId": user_id,
            "sessionStatus": session.status
        }),
        Some(session.host_id.clone()),
    );

    Ok(SessionResponseDto::from(session))
}
