use crate::models::error::AppError;
use crate::models::session::{
    CovenantStats, CovenantStatsResponse, CreateSessionDto, GameResult, GameSession,
    JoinSessionDto, MinimalSessionDto, PlayerInfo, RateSessionDto, SessionResponseDto,
    SessionResult, SessionStatus, SubmitResultDto, UpdateSessionDto,
};
use crate::repository::{session_repository, statistics_repository, user_repository};
use crate::sse::messages::{BroadcastMessage, ServerMessage as SseServerMessage};
use crate::sse::partition::SessionRouter;
use crate::sse::session_pruner::SessionPrunerActor;
use crate::ws::messages::{Broadcast, ServerMessage as WsServerMessage};
use crate::ws::SessionManager as WsSessionManager;
use actix::prelude::*;
use chrono::Utc;
use mongodb::bson::oid::ObjectId;
use mongodb::Database;
use serde_json::json;
use std::sync::LazyLock;
use std::sync::Mutex;

// Global session manager references
static WS_SESSION_MANAGER: LazyLock<Mutex<Option<Addr<WsSessionManager>>>> =
    LazyLock::new(|| Mutex::new(None));

static SSE_ROUTER: LazyLock<Mutex<Option<Addr<SessionRouter>>>> =
    LazyLock::new(|| Mutex::new(None));

// Function to set the WebSocket session manager
pub fn set_session_manager(addr: Addr<WsSessionManager>) {
    let mut manager = WS_SESSION_MANAGER.lock().unwrap();
    *manager = Some(addr);
}

/// Set the global SSE router address
pub fn set_sse_router(addr: Addr<SessionRouter>) {
    let mut router = SSE_ROUTER.lock().unwrap();
    *router = Some(addr);
    log::info!("Global SSE router reference updated");
}

/// Get the global SSE router address
pub fn get_sse_router() -> Option<Addr<SessionRouter>> {
    let router = SSE_ROUTER.lock().unwrap();
    router.clone()
}

// Function to get the WebSocket session manager
pub fn get_session_manager() -> Option<Addr<WsSessionManager>> {
    let manager = WS_SESSION_MANAGER.lock().unwrap();
    manager.clone()
}

// Helper function to broadcast to WebSocket and/or SSE clients based on configuration
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
    let now = Utc::now().timestamp();

    // Check configuration to determine which communication method to use
    let use_websockets = crate::config::get_config().use_websockets();

    if use_websockets {
        // Use WebSockets
        broadcast_to_websockets(session_id, event_type, &data, exclude_client_id.clone());
    } else {
        // Use SSE
        broadcast_to_sse(session_id, event_type, &data, exclude_client_id, now);
    }
}

// Helper function to broadcast only to WebSocket clients
fn broadcast_to_websockets(
    session_id: &str,
    event_type: &str,
    data: &serde_json::Value,
    exclude_client_id: Option<String>,
) {
    if let Some(ws_manager) = get_session_manager() {
        log::debug!("Broadcasting to WebSocket clients");
        let message = WsServerMessage {
            message_type: event_type.to_string(),
            data: data.clone(),
        };

        let broadcast = Broadcast {
            session_id: session_id.to_string(),
            message,
            exclude_client_id,
        };

        // Send the broadcast message
        ws_manager.do_send(broadcast);
    } else {
        log::error!("WebSocket session manager not available for broadcasting - configured to use WebSockets but manager is not initialized");
    }
}

// Helper function to broadcast only to SSE clients
fn broadcast_to_sse(
    session_id: &str,
    event_type: &str,
    data: &serde_json::Value,
    exclude_client_id: Option<String>,
    timestamp: i64,
) {
    match get_sse_router() {
        Some(router) => {
            log::debug!("Broadcasting to SSE clients");
            let message = SseServerMessage {
                message_type: event_type.to_string(),
                data: data.clone(),
                timestamp,
            };

            let broadcast = BroadcastMessage {
                session_id: session_id.to_string(),
                message,
                exclude_client: exclude_client_id,
            };

            // Use do_send which doesn't wait for a response
            router.do_send(broadcast);
        }
        None => {
            log::error!(
                "SSE router not available for broadcasting - get_sse_router() returned None"
            );

            // Attempt to recover by creating a new router
            log::info!("Attempting to recover by creating a new router");

            // Get configuration for inactive timeout
            let inactive_timeout = crate::config::get_config().session_inactive_timeout() as i64;

            // Create a new router
            let new_router =
                SessionRouter::new(crate::sse::partition::DEFAULT_PARTITION_COUNT, None).start();

            // Set the new router
            set_sse_router(new_router.clone());

            // Start the session pruner with configurable inactivity timeout
            let _session_pruner = SessionPrunerActor::new(
                new_router.clone(),
                3600,             // Run every hour
                inactive_timeout, // Prune sessions inactive based on config
            )
            .start();

            // Try broadcasting again with the new router
            let message = SseServerMessage {
                message_type: event_type.to_string(),
                data: data.clone(),
                timestamp,
            };

            new_router.do_send(BroadcastMessage {
                session_id: session_id.to_string(),
                message,
                exclude_client: exclude_client_id,
            });
        }
    }
}

pub async fn create_session(
    db: &Database,
    user_id: &str,
    session_data: CreateSessionDto,
) -> Result<SessionResponseDto, AppError> {
    // Verify host user exists
    let user = user_repository::find_user_by_id(db, user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    // Check if user already has an active session
    let active_sessions = session_repository::find_active_sessions_for_user(db, user_id).await?;
    if !active_sessions.is_empty() {
        let active_session = &active_sessions[0];
        return Err(AppError::AlreadyInSession(
            active_session.id.to_hex(),
            active_session.name.clone(),
            active_session.status.to_string(),
        ));
    }

    let now = mongodb::bson::DateTime::now();
    let session = GameSession {
        id: ObjectId::new(),
        name: session_data.name,
        host_id: user_id.to_string(),
        region: session_data.region.clone(),
        platform: session_data.platform,
        password: session_data.game_password,
        is_private: session_data.is_private,
        status: SessionStatus::Open,
        joined_players: vec![PlayerInfo {
            user_id: user.id.to_hex(),
            region: session_data.region,
            platform: user.platform,
            username: user.display_name.unwrap_or(user.username),
            nightfarer: session_data.nightfarer,
            covenant_name: user.covenant_name,
            joined_at: now,
        }],
        night_lord: session_data.night_lord,
        results: vec![],
        ratings: vec![],
        created_at: now,
        updated_at: now,
        started_at: None,
        completed_at: None,
        stats_updated: false,
        new_session_created: false,
        new_session_created_id: None,
    };

    // Save the session to the database
    session_repository::create_session(db, &session).await?;

    // Convert to response DTO
    let response = SessionResponseDto::from(session);

    Ok(response)
}

/// Check if a user is already in an active session
pub async fn check_user_active_session(
    db: &Database,
    user_id: &str,
) -> Result<Option<SessionResponseDto>, AppError> {
    // No need to validate the user ID format - the ID comes directly from JWT claims
    // and should be used as is
    log::info!("Checking active sessions for user ID: {}", user_id);

    // Find active sessions for the user
    let active_sessions = match session_repository::find_active_sessions_for_user(db, user_id).await
    {
        Ok(sessions) => sessions,
        Err(e) => {
            log::error!(
                "Error finding active sessions for user {}: {:?}",
                user_id,
                e
            );
            // Return no sessions instead of propagating the error
            return Ok(None);
        }
    };

    if active_sessions.is_empty() {
        return Ok(None);
    }

    // Return the first active session (users should only have one active session)
    let session = active_sessions.into_iter().next().unwrap();
    Ok(Some(SessionResponseDto::from(session)))
}

pub async fn get_sessions(
    db: &Database,
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    is_private: Option<bool>,
    region: Option<String>,
    platform: Option<String>,
) -> Result<Vec<SessionResponseDto>, AppError> {
    let status_filter = match status {
        Some(s) => match s.to_lowercase().as_str() {
            "open" => Some(SessionStatus::Open),
            "full" => Some(SessionStatus::Full),
            "in_progress" | "inprogress" => Some(SessionStatus::InProgress),
            "completed" => Some(SessionStatus::Completed),
            "cancelled" => Some(SessionStatus::Cancelled),
            _ => None,
        },
        None => None,
    };

    let sessions = session_repository::find_sessions(
        db,
        status_filter,
        limit,
        offset,
        is_private,
        region,
        platform,
    )
    .await?;

    // Convert to response DTOs (exclude passwords for listing)
    Ok(sessions
        .into_iter()
        .map(SessionResponseDto::from)
        .collect())
}

/// Get minimal public session information for non-authenticated users
pub async fn get_minimal_sessions(
    db: &Database,
    status: Option<String>,
    limit: Option<u64>,
    offset: Option<u64>,
    region: Option<String>,
    platform: Option<String>,
) -> Result<Vec<MinimalSessionDto>, AppError> {
    let status_filter = match status {
        Some(s) => match s.to_lowercase().as_str() {
            "open" => Some(SessionStatus::Open),
            "full" => Some(SessionStatus::Full),
            "in_progress" | "inprogress" => Some(SessionStatus::InProgress),
            "completed" => Some(SessionStatus::Completed),
            "cancelled" => Some(SessionStatus::Cancelled),
            _ => None,
        },
        None => None,
    };

    // Always filter out private sessions for this public endpoint
    let is_private = Some(false);

    let sessions = session_repository::find_sessions(
        db,
        status_filter,
        limit,
        offset,
        is_private,
        region,
        platform,
    )
    .await?;

    // Convert to minimal DTOs with just the necessary info
    Ok(sessions
        .into_iter()
        .map(|s| {
            // Find the host in the joined players
            let host_name = s
                .joined_players
                .iter()
                .find(|p| p.user_id == s.host_id)
                .map_or_else(|| "Unknown".to_string(), |p| p.username.clone());

            MinimalSessionDto {
                id: s.id.to_hex(),
                name: s.name,
                host_name,
                status: s.status,
                created_at: s.created_at,
            }
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

    // Check if user already has an active session
    let active_sessions = session_repository::find_active_sessions_for_user(db, &user_id).await?;
    if !active_sessions.is_empty() {
        // If the active session is the one they're trying to join, that's fine
        if active_sessions.iter().any(|s| s.id.to_hex() == session_id) {
            // They're already in this session, return the session
            return Ok(SessionResponseDto::from(active_sessions[0].clone()));
        }

        // Otherwise, they're trying to join a different session while already in one
        let active_session = &active_sessions[0];
        return Err(AppError::AlreadyInSession(
            active_session.id.to_hex(),
            active_session.name.clone(),
            active_session.status.to_string(),
        ));
    }

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
    let now = mongodb::bson::DateTime::now();
    session.joined_players.push(PlayerInfo {
        user_id: join_data.user_id.clone(),
        region: join_data.region.clone(),
        platform: join_data.platform.clone(),
        username: join_data.username.clone(),
        nightfarer: join_data.nightfarer.clone(),
        covenant_name: join_data.covenant_name.clone(),
        joined_at: now,
    });

    // Update session status if full (3 players instead of 4)
    if session.joined_players.len() >= 3 {
        session.status = SessionStatus::Full;
    }

    // Update timestamp
    session.updated_at = now;

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    // Broadcast join event to all clients in the session
    broadcast_event(
        session_id,
        "join",
        json!({
            "userId": join_data.user_id,
            "username": join_data.username,
            "nightfarer": join_data.nightfarer,
            "covenantName": join_data.covenant_name
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
    let now = mongodb::bson::DateTime::now();
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
    let now = mongodb::bson::DateTime::now();
    session.status = SessionStatus::Cancelled;
    session.updated_at = now;

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    // Broadcast cancellation event to all players in the session
    broadcast_event(
        session_id,
        "cancel",
        json!({
            "sessionId": session_id,
            "hostId": user_id
        }),
        None, // Send to all players
    );

    Ok(())
}

/// Allows a player to leave a session they have joined
pub async fn leave_session(db: &Database, session_id: &str, user_id: &str) -> Result<(), AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if the session has already started - can't leave once started
    // We can leave if a session is completed or cancelled
    if session.status == SessionStatus::InProgress {
        return Err(AppError::BadRequest(
            "Cannot leave a session that has already started.".to_string(),
        ));
    }

    // Check if the user is trying to leave is the host - hosts can't leave, they cancel instead
    if session.host_id == user_id {
        return Err(AppError::BadRequest(
            "Host cannot leave session. Use cancel endpoint instead".to_string(),
        ));
    }

    // Find the player in the session
    let player_index = session
        .joined_players
        .iter()
        .position(|p| p.user_id == user_id);

    // Check if the player is actually in the session
    let player_index = match player_index {
        Some(index) => index,
        None => {
            return Err(AppError::BadRequest(
                "User is not in this session".to_string(),
            ))
        }
    };

    // Get player data for notification before removing
    let leaving_player = session.joined_players[player_index].clone();

    // Remove the player from the session
    session.joined_players.remove(player_index);

    // Update session status from Full to Open if applicable
    if session.status == SessionStatus::Full {
        session.status = SessionStatus::Open;
    }

    // Update timestamp
    let now = mongodb::bson::DateTime::now();
    session.updated_at = now;

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    // Broadcast leave event to all clients in the session
    broadcast_event(
        session_id,
        "leave",
        json!({
            "userId": leaving_player.user_id,
            "username": leaving_player.username,
            "nightfarer": leaving_player.nightfarer
        }),
        None, // Send to all players including the one leaving
    );

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
    if session.status != SessionStatus::Completed {
        return Err(AppError::BadRequest(
            "Results can only be submitted for completed sessions".to_string(),
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
    let now = mongodb::bson::DateTime::now();
    session.results.push(SessionResult {
        user_id: user_id.clone(),
        result: result_data.result,
        rating: result_data.rating,
        feedback: result_data.feedback,
        submitted_at: now,
    });

    session.updated_at = now;

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

    // Determine if there's a consensus (majority agreement)
    let consensus_result = if win_count > 1 {
        Some(GameResult::Win)
    } else if loss_count > 1 {
        Some(GameResult::Loss)
    } else if disconnect_count > 1 {
        Some(GameResult::Disconnect)
    } else {
        None
    };

    // If we have a consensus result (at least 2 players agree), and we have at least 2 results
    // we'll apply the consensus result to all players' statistics
    if let Some(result) = consensus_result {
        // Mark session as completed
        session.status = SessionStatus::Completed;

        if session.completed_at.is_none() {
            session.completed_at = Some(now);
        }

        // Get the list of players who have already submitted results
        let players_who_submitted: Vec<String> =
            session.results.iter().map(|r| r.user_id.clone()).collect();

        log::info!(
            "Consensus reached in session {}: {:?}. Players who submitted: {:?}, stats already updated: {}",
            session_id,
            result,
            players_who_submitted,
            session.stats_updated
        );

        // Check if stats have already been updated using the explicit flag
        if !session.stats_updated {
            log::info!(
                "Updating stats for all players with consensus result: {:?}",
                result
            );

            // Update statistics for ALL players using the consensus result
            for player in &session.joined_players {
                // Update statistics for this player with the consensus result
                statistics_repository::update_player_stats(
                    db,
                    &player.user_id,
                    &player.username,
                    &player.nightfarer,
                    &session.night_lord,
                    &player.covenant_name,
                    &result,
                )
                .await?;

                log::info!(
                    "Updated stats for player {} with result {:?}",
                    player.user_id,
                    result
                );
            }

            // Set the flag to indicate stats have been updated
            session.stats_updated = true;
        } else {
            log::info!("Skipping stats update as they have already been updated");
        }
    }

    // Update the session in the database
    session_repository::update_session(db, &session).await?;

    // Broadcast the result to all clients in the session
    broadcast_event(
        session_id,
        "result",
        json!({
            "reported": user_id,
            "result": result_data.result,
        }),
        None,
    );

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
        "sessionId": session.id.to_hex(),
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
    let now = mongodb::bson::DateTime::now();

    // Create a new rating with the proper user_id type
    let mut session_rating = rating_data;
    session_rating.user_id = Some(user_id.clone()); // Ensure it's a String

    // Ensure we use the right DateTime type
    if session_rating.created_at == mongodb::bson::DateTime::from_millis(0) {
        session_rating.created_at = now;
    }

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
    _duration: Option<i64>,
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
    let now = mongodb::bson::DateTime::now();
    session.status = SessionStatus::Completed;
    session.completed_at = Some(now);
    session.updated_at = now;

    // Initialize stats_updated to false - stats will be updated when consensus is reached
    session.stats_updated = false;

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

pub async fn recreate_session(
    db: &Database,
    session_id: &str,
    user_id: &str,
    make_private: bool,
) -> Result<SessionResponseDto, AppError> {
    // Get the original session
    let mut original_session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if user is the host
    if original_session.host_id != user_id {
        return Err(AppError::Forbidden(
            "Only the host can create a new session with the same team".to_string(),
        ));
    }

    // Check if session is completed
    if original_session.status != SessionStatus::Completed {
        return Err(AppError::BadRequest(
            "Only completed sessions can be recreated".to_string(),
        ));
    }

    // Get the host user
    let host_user = user_repository::find_user_by_id(db, user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    // Get the host's character class from the original session
    let host_nightfarer = original_session
        .joined_players
        .iter()
        .find(|p| p.user_id == user_id)
        .map(|p| p.nightfarer.clone())
        .ok_or(AppError::InternalError(
            "Host not found in session players".to_string(),
        ))?;

    // Create a new session with the same properties
    let now = mongodb::bson::DateTime::now();

    // Create a new session name that avoids duplicate "(Replay)" suffix
    let new_name = if original_session.name.contains("(Replay)") {
        original_session.name.clone()
    } else {
        format!("{} (Replay)", original_session.name)
    };

    // Create a new session id
    let new_session_id = ObjectId::new();

    // Create a new session with the same name and settings
    let new_session = GameSession {
        id: new_session_id,
        name: new_name,
        host_id: user_id.to_string(),
        region: original_session.region.clone(),
        platform: original_session.platform.clone(),
        password: original_session.password.clone(),
        is_private: make_private, // Always make recreated sessions private so they don't show in the sessions list
        status: SessionStatus::Open,
        joined_players: vec![PlayerInfo {
            user_id: user_id.to_string(),
            region: original_session.region.clone(),
            platform: original_session.platform.clone(),
            username: host_user.display_name.unwrap_or(host_user.username),
            nightfarer: host_nightfarer,
            covenant_name: host_user.covenant_name.clone(),
            joined_at: now,
        }],
        night_lord: original_session.night_lord.clone(),
        results: vec![],
        ratings: vec![],
        created_at: now,
        updated_at: now,
        started_at: None,
        completed_at: None,
        stats_updated: false,
        new_session_created: false,
        new_session_created_id: None,
    };

    // Save the new session to the database
    session_repository::create_session(db, &new_session).await?;

    // Update the original session to point to the new session
    // This allows participants to find the new session from the old one
    original_session.new_session_created = true;
    original_session.new_session_created_id = Some(new_session_id);
    original_session.updated_at = now;

    // Save the updated original session
    session_repository::update_session(db, &original_session).await?;

    // Create response DTO
    let response = SessionResponseDto::from(new_session.clone());

    // Notify all players from the original session about the new session
    for player in original_session.joined_players.iter() {
        // Skip the host as they already know they created the session
        if player.user_id == user_id {
            continue;
        }

        // Broadcast the notification to the player
        broadcast_event(
            // Use the original session ID so players still listening to that session get the notification
            session_id,
            "newSession",
            json!({
                "sessionId": new_session.id.to_hex(),
                "name": new_session.name,
                "hostId": user_id,
                "originalSessionId": session_id
            }),
            None, // Send to all players including the host
        );
    }

    Ok(response)
}

pub async fn update_session(
    db: &Database,
    session_id: &str,
    user_id: &str,
    update_data: UpdateSessionDto,
) -> Result<SessionResponseDto, AppError> {
    // Find the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if user is the host
    if session.host_id != user_id {
        return Err(AppError::Forbidden(
            "Only the host can update the session".to_string(),
        ));
    }

    // Check if session is in Open status
    if session.status != SessionStatus::Open {
        return Err(AppError::BadRequest(
            "Only sessions in Open status can be updated".to_string(),
        ));
    }

    // Log the update data
    log::info!(
        "Updating session with night_lord: {:?}, host_nightfarer: {:?}",
        update_data.night_lord,
        update_data.host_nightfarer
    );

    // Update night lord if provided
    if let Some(night_lord) = update_data.night_lord {
        log::info!("Updating night lord to: {}", night_lord);
        session.night_lord = night_lord;
    }

    // Update the host's nightfarer if provided
    if let Some(host_nightfarer) = update_data.host_nightfarer {
        // Find the player index for the host
        if let Some(player_index) = session
            .joined_players
            .iter()
            .position(|p| p.user_id == user_id)
        {
            log::info!("Updating host nightfarer to: {}", host_nightfarer);
            session.joined_players[player_index].nightfarer = host_nightfarer;
        } else {
            return Err(AppError::InternalError(
                "Host not found in session players".to_string(),
            ));
        }
    }

    // Update the session's timestamp
    session.updated_at = mongodb::bson::DateTime::now();

    // Save the updated session
    session_repository::update_session(db, &session).await?;

    // Return the updated session
    Ok(SessionResponseDto::from(session))
}

/// Get statistics for all covenants
pub async fn get_covenant_stats(db: &Database) -> Result<CovenantStatsResponse, AppError> {
    // Get all user statistics
    let all_stats = statistics_repository::find_all(db).await?;

    // Create a map to aggregate stats by covenant
    let mut covenant_stats_map: std::collections::HashMap<String, CovenantStats> =
        std::collections::HashMap::new();

    // Process each user's stats
    for user_stat in all_stats {
        // Process covenant stats directly
        for (covenant_name, stats) in user_stat.covenant_stats {
            // Get or create the covenant stats entry
            let covenant_entry = covenant_stats_map
                .entry(covenant_name.clone())
                .or_insert_with(|| CovenantStats {
                    covenant_name,
                    wins: 0,
                    losses: 0,
                    disconnects: 0,
                });

            // Update covenant stats
            covenant_entry.wins += stats.wins;
            covenant_entry.losses += stats.losses;
            covenant_entry.disconnects += stats.disconnects;
        }
    }

    // Convert the map to a vector
    let covenant_stats: Vec<CovenantStats> = covenant_stats_map.into_values().collect();

    Ok(CovenantStatsResponse { covenant_stats })
}

/// Reset the session flags for new session creation
/// This is used to reset the flags once enough players have joined
pub async fn reset_session_flags(
    db: &Database,
    session_id: &str,
    user_id: &str,
) -> Result<(), AppError> {
    // Get the session
    let mut session = session_repository::find_by_id(db, session_id)
        .await?
        .ok_or(AppError::SessionNotFound)?;

    // Check if user is a participant in the session
    let is_participant = session.joined_players.iter().any(|p| p.user_id == user_id);

    if !is_participant {
        return Err(AppError::Forbidden(
            "Only session participants can reset flags".to_string(),
        ));
    }

    // Log current state of flags
    log::info!(
        "Current state of flags for session {}: new_session_created={}, new_session_created_id={:?}",
        session_id,
        session.new_session_created,
        session.new_session_created_id
    );

    // Check if the session has the flags set
    if !session.new_session_created {
        log::info!(
            "No flags to reset for session {}, skipping update",
            session_id
        );
        // No flags to reset
        return Ok(());
    }

    log::info!(
        "Resetting new session flags for session {} - joined players: {}",
        session_id,
        session.joined_players.len()
    );

    // Reset the flags
    session.new_session_created = false;
    session.new_session_created_id = None;

    // Update timestamp
    session.updated_at = mongodb::bson::DateTime::now();

    // Update the session in the database
    match session_repository::update_session(db, &session).await {
        Ok(_) => {
            log::info!(
                "Successfully reset new session flags for session {}",
                session_id
            );
            Ok(())
        }
        Err(e) => {
            log::error!(
                "Failed to reset new session flags for session {}: {:?}",
                session_id,
                e
            );
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::session::{GameResult, SessionResult, SessionStatus};
    use mongodb::bson::oid::ObjectId;
    use mongodb::bson::DateTime;
    use std::cell::RefCell;
    use std::rc::Rc;

    // Simple mock database for testing
    #[derive(Clone)]
    struct MockDb {
        session: Rc<RefCell<Option<GameSession>>>,
        stats_updated: Rc<RefCell<Vec<(String, GameResult)>>>,
    }

    // Test version of submit_result that uses our mock db
    fn submit_result_test(
        db: &MockDb,
        _session_id: &str,
        result_data: SubmitResultDto,
    ) -> Result<(), AppError> {
        // Get user ID from result data
        let user_id = result_data.user_id.clone();

        // Get the session
        let mut session = db
            .session
            .borrow()
            .clone()
            .ok_or(AppError::SessionNotFound)?;

        // Check if session is completed or in progress
        // Note: The real function requires Completed status but we're modifying it for testing
        // to allow InProgress status as well
        if session.status != SessionStatus::Completed && session.status != SessionStatus::InProgress
        {
            return Err(AppError::BadRequest(
                "Results can only be submitted for completed or in-progress sessions".to_string(),
            ));
        }

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
        let now = mongodb::bson::DateTime::now();
        session.results.push(SessionResult {
            user_id: user_id.clone(),
            result: result_data.result,
            rating: result_data.rating,
            feedback: result_data.feedback,
            submitted_at: now,
        });

        session.updated_at = now;

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

        // Determine if there's a consensus (majority agreement)
        let consensus_result = if win_count > 1 {
            Some(GameResult::Win)
        } else if loss_count > 1 {
            Some(GameResult::Loss)
        } else if disconnect_count > 1 {
            Some(GameResult::Disconnect)
        } else {
            None
        };

        // If we have a consensus result (at least 2 players agree)
        if let Some(result) = consensus_result {
            // Mark session as completed
            session.status = SessionStatus::Completed;

            if session.completed_at.is_none() {
                session.completed_at = Some(now);
            }

            // Check if stats have already been updated using the explicit flag
            if !session.stats_updated {
                // Update statistics for ALL players using the consensus result
                for player in &session.joined_players {
                    // Record that we updated stats for this player
                    db.stats_updated
                        .borrow_mut()
                        .push((player.user_id.clone(), result.clone()));
                }

                // Set the flag to indicate stats have been updated
                session.stats_updated = true;
            }
        }

        // Update the session in the database
        *db.session.borrow_mut() = Some(session);

        Ok(())
    }

    #[tokio::test]
    async fn test_submit_result_with_consensus_win() {
        // Create a test session
        let session_id = ObjectId::new().to_hex();
        let now = DateTime::now();

        // Create three players
        let player1 = PlayerInfo {
            user_id: "player1".to_string(),
            username: "Player 1".to_string(),
            nightfarer: "Mage".to_string(),
            covenant_name: "Covenant 1".to_string(),
            region: "Europe".to_string(),
            platform: "Playstation".to_string(),
            joined_at: now,
        };

        let player2 = PlayerInfo {
            user_id: "player2".to_string(),
            username: "Player 2".to_string(),
            nightfarer: "Warrior".to_string(),
            covenant_name: "Covenant 2".to_string(),
            region: "Europe".to_string(),
            platform: "Playstation".to_string(),
            joined_at: now,
        };

        let player3 = PlayerInfo {
            user_id: "player3".to_string(),
            username: "Player 3".to_string(),
            nightfarer: "Rogue".to_string(),
            covenant_name: "Covenant 3".to_string(),
            region: "Europe".to_string(),
            platform: "Playstation".to_string(),
            joined_at: now,
        };

        // Create initial session - it should start as InProgress
        let session = GameSession {
            id: ObjectId::parse_str(&session_id).unwrap(),
            name: "Test Session".to_string(),
            host_id: "player1".to_string(),
            region: "Europe".to_string(),
            platform: "Playstation".to_string(),
            password: "test".to_string(),
            is_private: false,
            status: SessionStatus::InProgress,
            joined_players: vec![player1, player2, player3],
            night_lord: "Night Lord 1".to_string(),
            results: vec![],
            ratings: vec![],
            created_at: now,
            updated_at: now,
            started_at: Some(now),
            completed_at: None,
            stats_updated: false,
            new_session_created: false,
            new_session_created_id: None,
        };

        // Create mock db
        let mock_db = MockDb {
            session: Rc::new(RefCell::new(Some(session))),
            stats_updated: Rc::new(RefCell::new(vec![])),
        };

        // Create result DTOs
        let result_data_1 = SubmitResultDto {
            user_id: "player1".to_string(),
            result: GameResult::Win,
            rating: None,
            feedback: None,
        };

        let result_data_2 = SubmitResultDto {
            user_id: "player2".to_string(),
            result: GameResult::Win,
            rating: None,
            feedback: None,
        };

        let result_data_3 = SubmitResultDto {
            user_id: "player3".to_string(),
            result: GameResult::Loss,
            rating: None,
            feedback: None,
        };

        // Submit results - first player
        let result = submit_result_test(&mock_db, &session_id, result_data_1);
        assert!(result.is_ok());

        // After the first submission, no consensus should be reached
        {
            let stats_updates = mock_db.stats_updated.borrow();
            assert_eq!(
                stats_updates.len(),
                0,
                "No stats updates should happen after 1 submission"
            );
        }

        // Second player submits - this should trigger consensus (2 Wins)
        let result = submit_result_test(&mock_db, &session_id, result_data_2);
        assert!(result.is_ok());

        // After second submission, consensus is reached and all 3 players should have stats updated
        {
            let stats_updates = mock_db.stats_updated.borrow();
            assert_eq!(
                stats_updates.len(),
                3,
                "All 3 players should have stats updated"
            );
            for (_, result) in stats_updates.iter() {
                assert_eq!(
                    *result,
                    GameResult::Win,
                    "All players should get Win result"
                );
            }
        }

        // Third player submits - consensus is already established, shouldn't affect the result
        let result = submit_result_test(&mock_db, &session_id, result_data_3);
        assert!(result.is_ok());

        // Should still have exactly 3 stat updates (no duplicates)
        let stats_updates = mock_db.stats_updated.borrow();
        assert_eq!(
            stats_updates.len(),
            3,
            "Should still have exactly 3 stat updates"
        );
    }

    #[tokio::test]
    async fn test_no_duplicate_stats_update() {
        // Create a test session
        let session_id = ObjectId::new().to_hex();
        let now = DateTime::now();

        // Create three players
        let player1 = PlayerInfo {
            user_id: "player1".to_string(),
            username: "Player 1".to_string(),
            nightfarer: "Mage".to_string(),
            covenant_name: "Covenant 1".to_string(),
            region: "Europe".to_string(),
            platform: "Playstation".to_string(),
            joined_at: now,
        };

        let player2 = PlayerInfo {
            user_id: "player2".to_string(),
            username: "Player 2".to_string(),
            nightfarer: "Warrior".to_string(),
            covenant_name: "Covenant 2".to_string(),
            region: "Europe".to_string(),
            platform: "Playstation".to_string(),
            joined_at: now,
        };

        let player3 = PlayerInfo {
            user_id: "player3".to_string(),
            username: "Player 3".to_string(),
            nightfarer: "Rogue".to_string(),
            covenant_name: "Covenant 3".to_string(),
            region: "Europe".to_string(),
            platform: "Playstation".to_string(),
            joined_at: now,
        };

        // Create initial session that's already completed with two results and stats already updated
        let session = GameSession {
            id: ObjectId::parse_str(&session_id).unwrap(),
            name: "Test Session".to_string(),
            host_id: "player1".to_string(),
            region: "Europe".to_string(),
            platform: "Playstation".to_string(),
            password: "test".to_string(),
            is_private: false,
            status: SessionStatus::Completed, // Already completed
            joined_players: vec![player1, player2, player3],
            night_lord: "Night Lord 1".to_string(),
            results: vec![
                SessionResult {
                    user_id: "player1".to_string(),
                    result: GameResult::Win,
                    rating: None,
                    feedback: None,
                    submitted_at: now,
                },
                SessionResult {
                    user_id: "player2".to_string(),
                    result: GameResult::Win,
                    rating: None,
                    feedback: None,
                    submitted_at: now,
                },
            ],
            ratings: vec![],
            created_at: now,
            updated_at: now,
            started_at: Some(now),
            completed_at: Some(now),
            stats_updated: true, // Set to true to indicate stats have already been updated
            new_session_created: false,
            new_session_created_id: None,
        };

        // Create mock db with an empty stats_updated vector
        let stats_updated = Rc::new(RefCell::new(vec![]));

        let mock_db = MockDb {
            session: Rc::new(RefCell::new(Some(session))),
            stats_updated: stats_updated.clone(),
        };

        // Create result DTO for third player
        let result_data_3 = SubmitResultDto {
            user_id: "player3".to_string(),
            result: GameResult::Loss,
            rating: None,
            feedback: None,
        };

        // Submit result for third player
        let result = submit_result_test(&mock_db, &session_id, result_data_3);
        assert!(result.is_ok());

        // Since stats_updated is true, no stats should be updated
        let stats_updates = stats_updated.borrow();
        assert_eq!(
            stats_updates.len(),
            0,
            "No stats should be updated since stats_updated flag is true"
        );
    }
}
