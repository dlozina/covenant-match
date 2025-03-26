use crate::sse::messages::{
    BroadcastMessage, ConnectSSE, DisconnectSSE, GetRecentEvents, GetSessionStatus, ServerMessage,
    SessionInfo, SseSessionStatus,
};
use crate::ws::messages::ServerMessage as WsServerMessage;
use actix::prelude::*;
use chrono;
use log::{debug, error, info, warn};
use serde_json;
use std::collections::{HashMap, HashSet, VecDeque};
use tokio::sync::mpsc;

/// Actor that manages all active SSE sessions
pub struct SessionManager {
    // Map of session_id -> set of client_ids
    sessions: HashMap<String, HashSet<String>>,
    // Map of client_id -> client sender channel
    clients: HashMap<String, mpsc::Sender<ServerMessage>>,
    // Reference to WebSocket session manager for dual broadcasting
    ws_session_manager: Option<Addr<crate::ws::session::SessionManager>>,
    // Add a new field to store recent events for each session
    recent_events: HashMap<String, VecDeque<ServerMessage>>,
}

impl Default for SessionManager {
    fn default() -> Self {
        Self {
            sessions: HashMap::new(),
            clients: HashMap::new(),
            ws_session_manager: None,
            recent_events: HashMap::new(),
        }
    }
}

impl SessionManager {
    pub fn new(ws_session_manager: Addr<crate::ws::session::SessionManager>) -> Self {
        log::info!("Creating new SSE SessionManager");
        Self {
            sessions: HashMap::new(),
            clients: HashMap::new(),
            ws_session_manager: Some(ws_session_manager),
            recent_events: HashMap::new(),
        }
    }

    // New method that doesn't require a WebSocket manager
    pub fn new_standalone() -> Self {
        log::info!("Creating new standalone SSE SessionManager (without WebSocket)");
        Self {
            sessions: HashMap::new(),
            clients: HashMap::new(),
            ws_session_manager: None,
            recent_events: HashMap::new(),
        }
    }

    pub fn store_recent_event(&mut self, session_id: &str, event: ServerMessage) {
        log::debug!("Storing event for session {}: {:?}", session_id, event);

        // Ensure the session exists in the recent_events map
        if !self.recent_events.contains_key(session_id) {
            log::info!("Creating new events list for session: {}", session_id);
            self.recent_events
                .insert(session_id.to_string(), VecDeque::new());
        }

        // Get the events list for this session
        if let Some(events) = self.recent_events.get_mut(session_id) {
            events.push_back(event);

            // Limit the number of stored events (keep last 100)
            while events.len() > 100 {
                events.pop_front();
            }

            log::debug!(
                "Now storing {} events for session {}",
                events.len(),
                session_id
            );
        } else {
            log::error!(
                "Failed to store event for session {}: events list not found",
                session_id
            );
        }
    }

    pub fn get_recent_events(
        &self,
        session_id: &str,
        since_timestamp: Option<i64>,
    ) -> Vec<ServerMessage> {
        log::debug!(
            "Getting events for session {} since {:?}",
            session_id,
            since_timestamp
        );

        match self.recent_events.get(session_id) {
            Some(events) => {
                let filtered_events: Vec<ServerMessage> = match since_timestamp {
                    Some(timestamp) => events
                        .iter()
                        .filter(|e| e.timestamp > timestamp)
                        .cloned()
                        .collect(),
                    None => events.iter().cloned().collect(),
                };

                log::debug!(
                    "Found {} events for session {} (filtered from {})",
                    filtered_events.len(),
                    session_id,
                    events.len()
                );

                filtered_events
            }
            None => {
                log::warn!("No events found for session {}", session_id);
                Vec::new()
            }
        }
    }

    pub fn clean_up_events(&mut self) {
        // Instead of removing events for non-existent sessions, we'll keep them
        // for a while in case clients connect to those sessions later

        // Log the current state of sessions and events
        log::debug!(
            "Current sessions: {:?}, Current events: {:?}",
            self.sessions.keys().collect::<Vec<_>>(),
            self.recent_events.keys().collect::<Vec<_>>()
        );

        // We'll only clean up events for sessions that have been empty for a long time
        // For now, we'll just log which sessions have events but no clients
        for session_id in self.recent_events.keys() {
            if !self.sessions.contains_key(session_id) {
                log::debug!("Session {} has events but no connected clients", session_id);
            }
        }
    }

    // Modify the broadcast method to also store events
    fn broadcast(
        &mut self,
        session_id: &str,
        message: ServerMessage,
        exclude_client: Option<String>,
    ) {
        // Special case for broadcasting to all sessions
        if session_id == "all" {
            // Get all session IDs
            let session_ids: Vec<String> = self.sessions.keys().cloned().collect();

            // Special debug logging for heartbeat events
            if message.message_type == "heartbeat" {
                info!(
                    "Broadcasting HEARTBEAT to ALL sessions (count: {}): {:?}",
                    session_ids.len(),
                    message.data
                );
            } else {
                info!(
                    "Broadcasting message to ALL sessions: {:?}",
                    message.message_type
                );
            }

            // If we have no active sessions but the message is a heartbeat
            if session_ids.is_empty() {
                if message.message_type == "heartbeat" {
                    // Instead of storing in "all" session (which doesn't exist),
                    // log this event but don't store it anywhere since there are no active sessions
                    info!("No active sessions found for heartbeat message. Not storing for non-existent 'all' session.");
                } else {
                    info!("No active sessions found for broadcast message");
                }
                return;
            }

            // For each actual session, store the message and forward to their clients
            for sid in &session_ids {
                // Store the event for this specific session
                self.store_recent_event(sid, message.clone());

                if message.message_type == "heartbeat" {
                    info!("❤️ Stored heartbeat for session: {}", sid);
                }

                // Get clients for this session
                if let Some(clients) = self.sessions.get(sid) {
                    for client_id in clients {
                        // Skip excluded client if specified
                        if let Some(ref exclude_id) = exclude_client {
                            if client_id == exclude_id {
                                continue;
                            }
                        }

                        // Send to each client
                        if let Some(client_sender) = self.clients.get(client_id) {
                            match client_sender.try_send(message.clone()) {
                                Ok(_) => {
                                    if message.message_type == "heartbeat" {
                                        debug!(
                                            "❤️ Heartbeat sent to client {} in session {}",
                                            client_id, sid
                                        );
                                    } else {
                                        debug!(
                                            "Message sent to client {} in session {}",
                                            client_id, sid
                                        );
                                    }
                                }
                                Err(err) => {
                                    error!(
                                        "Failed to send message to client {} in session {}: {:?}",
                                        client_id, sid, err
                                    );
                                }
                            }
                        }
                    }
                }
            }

            return;
        }

        // Regular case for a specific session
        // Store the event for polling clients
        self.store_recent_event(session_id, message.clone());

        // First collect the clients to process to avoid borrow conflicts
        let mut to_process = Vec::new();

        // Get a list of clients to send to (avoiding the borrow checker issues)
        if let Some(clients) = self.sessions.get(session_id) {
            for client_id in clients {
                // Skip excluded client if specified
                if let Some(ref exclude_id) = exclude_client {
                    if client_id == exclude_id {
                        continue;
                    }
                }

                to_process.push(client_id.clone());
            }
        } else {
            // Session doesn't exist yet or has no clients
            info!(
                "Session {} not found in sessions map, but event was stored for future clients",
                session_id
            );
        }

        if to_process.is_empty() {
            return; // No clients to process
        }

        // Process all clients that need messages
        let mut clients_to_remove = Vec::new();

        for client_id in to_process {
            if let Some(client_sender) = self.clients.get(&client_id) {
                // Use try_send() which returns a Result
                match client_sender.try_send(message.clone()) {
                    Ok(_) => {
                        // Message queued successfully
                        debug!("SSE Message sent to client {}", client_id);
                    }
                    Err(err) => {
                        // Handle different types of errors
                        match err {
                            // Channel is closed or full
                            tokio::sync::mpsc::error::TrySendError::Full(_) => {
                                warn!(
                                    "Client {} channel is full - possible slow consumer, not removing yet",
                                    client_id
                                );
                                // Don't remove immediately for temporary backpressure
                            }
                            tokio::sync::mpsc::error::TrySendError::Closed(_) => {
                                // Client is definitely disconnected
                                error!(
                                    "Client {} channel is closed - client disconnected",
                                    client_id
                                );
                                // Mark for removal
                                clients_to_remove.push(client_id);
                            }
                        }
                    }
                }
            }
        }

        // Clean up any disconnected clients
        for client_id in clients_to_remove {
            self.clients.remove(&client_id);
            if let Some(session_clients) = self.sessions.get_mut(session_id) {
                session_clients.remove(&client_id);
            }
        }

        // Also broadcast to WebSocket clients if we have a reference to the WS session manager
        if let Some(ref ws_manager) = self.ws_session_manager {
            // Convert SSE message to WebSocket message format
            let ws_message = WsServerMessage {
                message_type: message.message_type.clone(),
                data: message.data.clone(),
            };

            // Create a broadcast message for WebSocket clients
            let ws_broadcast = crate::ws::messages::Broadcast {
                session_id: session_id.to_string(),
                message: ws_message,
                exclude_client_id: exclude_client,
            };

            // Send to WebSocket session manager
            ws_manager.do_send(ws_broadcast);
        }
    }

    // Add a method to clean up events for a session
    fn cleanup_session_events(&mut self, session_id: &str) {
        // Instead of removing events, just log that we would have cleaned them up
        if let Some(clients) = self.sessions.get(session_id) {
            if clients.is_empty() {
                // If no clients are connected to this session, log but don't remove events
                log::info!(
                    "Session {} has no connected clients but keeping events",
                    session_id
                );
            }
        } else {
            // Session doesn't exist in the sessions map, but we'll keep the events
            if self.recent_events.contains_key(session_id) {
                log::info!(
                    "Session {} not found in sessions map but keeping events",
                    session_id
                );
            }
        }
    }
}

impl Actor for SessionManager {
    type Context = Context<Self>;

    fn started(&mut self, _: &mut Self::Context) {
        info!("SSE SessionManager actor started");
    }

    fn stopped(&mut self, _: &mut Self::Context) {
        info!("SSE SessionManager actor stopped");
    }
}

/// Handler for ConnectSSE message
impl Handler<ConnectSSE> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: ConnectSSE, _: &mut Context<Self>) {
        log::info!(
            "New SSE client connected: {} for session: {}",
            msg.client_id,
            msg.session_id
        );

        // First, prepare all the data we need
        let session_id = msg.session_id.clone();
        let client_id = msg.client_id.clone();
        let sender = msg.sender.clone();

        // Create the connection event
        let connection_event = ServerMessage {
            message_type: "connection".to_string(),
            data: serde_json::json!({
                "client_id": client_id.clone(),
                "session_id": session_id.clone(),
                "connected_at": chrono::Utc::now().timestamp(),
            }),
            timestamp: chrono::Utc::now().timestamp(),
        };

        // Create the welcome message
        let welcome_message = ServerMessage {
            message_type: "welcome".to_string(),
            data: serde_json::json!({
                "message": "Welcome to the session!",
                "session_id": session_id.clone(),
                "connected_at": chrono::Utc::now().timestamp(),
            }),
            timestamp: chrono::Utc::now().timestamp(),
        };

        // Get existing events for this session before we modify anything
        let existing_events = if let Some(events) = self.recent_events.get(&session_id) {
            events.iter().cloned().collect::<Vec<_>>()
        } else {
            Vec::new()
        };

        // Now do all the mutations one at a time

        // 1. Ensure the session exists in the sessions map
        if !self.sessions.contains_key(&session_id) {
            log::info!("Creating new SSE session: {}", session_id);
            self.sessions.insert(session_id.clone(), HashSet::new());
        }

        // 2. Ensure the session exists in the recent_events map
        if !self.recent_events.contains_key(&session_id) {
            log::info!("Creating events list for new session: {}", session_id);
            self.recent_events
                .insert(session_id.clone(), VecDeque::new());
        } else {
            log::info!(
                "Session {} already has {} events",
                session_id,
                self.recent_events.get(&session_id).map_or(0, |e| e.len())
            );
        }

        // 3. Add the client to the session
        if let Some(session) = self.sessions.get_mut(&session_id) {
            session.insert(client_id.clone());
        }

        // 4. Store the client sender
        self.clients.insert(client_id.clone(), sender.clone());

        // 5. Store the connection event - this is a separate mutable borrow
        {
            // Create a new scope to limit the mutable borrow
            if let Some(events) = self.recent_events.get_mut(&session_id) {
                events.push_back(connection_event);

                // Limit the number of stored events (keep last 100)
                while events.len() > 100 {
                    events.pop_front();
                }

                log::debug!(
                    "Now storing {} events for session {}",
                    events.len(),
                    session_id
                );
            }
        }

        // 6. Send the welcome message
        if let Err(e) = sender.try_send(welcome_message) {
            error!("Failed to send welcome message: {}", e);
        }

        // 7. Send all existing events to the new client
        if !existing_events.is_empty() {
            log::info!(
                "Sending {} existing events to new client {}",
                existing_events.len(),
                client_id
            );

            for event in existing_events {
                if let Err(e) = sender.try_send(event) {
                    log::error!(
                        "Failed to send existing event to client {}: {}",
                        client_id,
                        e
                    );
                }
            }
        }

        // 8. Log the number of clients in the session
        if let Some(session) = self.sessions.get(&session_id) {
            log::info!(
                "Client {} added to session {}. Total clients: {}",
                client_id,
                session_id,
                session.len()
            );
        }
    }
}

/// Handler for DisconnectSSE message
impl Handler<DisconnectSSE> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: DisconnectSSE, _: &mut Context<Self>) {
        debug!(
            "SSE Client {} disconnected from session {}",
            msg.client_id, msg.session_id
        );

        // Remove client from session
        if let Some(clients) = self.sessions.get_mut(&msg.session_id) {
            clients.remove(&msg.client_id);

            // If session is empty, remove it from the sessions map but keep the events
            if clients.is_empty() {
                self.sessions.remove(&msg.session_id);
                debug!(
                    "Session {} removed from sessions map (no SSE clients left)",
                    msg.session_id
                );

                // Log but don't clean up events for this session
                log::info!(
                    "Session {} has no connected clients but keeping events",
                    msg.session_id
                );
            } else {
                debug!(
                    "Session {} now has {} SSE clients",
                    msg.session_id,
                    clients.len()
                );
            }
        }

        // Remove client sender
        self.clients.remove(&msg.client_id);
    }
}

// Handler for BroadcastMessage
impl Handler<BroadcastMessage> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: BroadcastMessage, _: &mut Context<Self>) {
        log::debug!(
            "Broadcasting message to session {}: {:?}",
            msg.session_id,
            msg.message
        );

        // Ensure the session exists in the recent_events map
        if !self.recent_events.contains_key(&msg.session_id) {
            log::info!(
                "Creating events list for session before broadcast: {}",
                msg.session_id
            );
            self.recent_events
                .insert(msg.session_id.clone(), VecDeque::new());
        }

        // Store the message in recent events
        self.store_recent_event(&msg.session_id, msg.message.clone());

        // Get the session clients
        if let Some(session) = self.sessions.get(&msg.session_id) {
            log::debug!(
                "Broadcasting to {} clients in session {}",
                session.len(),
                msg.session_id
            );

            // Send the message to all clients in the session
            for client_id in session {
                // Skip excluded client if specified
                if let Some(ref exclude_id) = msg.exclude_client {
                    if client_id == exclude_id {
                        continue;
                    }
                }

                if let Some(client_sender) = self.clients.get(client_id) {
                    if let Err(e) = client_sender.try_send(msg.message.clone()) {
                        log::error!("Failed to send message to client {}: {}", client_id, e);
                    } else {
                        log::debug!("Message sent to client {}", client_id);
                    }
                }
            }
        } else {
            // Even if there are no connected clients, we still store the event
            log::info!(
                "Session {} not found in sessions map, but event was stored for future clients",
                msg.session_id
            );
        }

        // Also broadcast to WebSocket clients if we have a reference to the WS session manager
        if let Some(ref ws_manager) = self.ws_session_manager {
            // Convert SSE message to WebSocket message format
            let ws_message = WsServerMessage {
                message_type: msg.message.message_type.clone(),
                data: msg.message.data.clone(),
            };

            // Create a broadcast message for WebSocket clients
            let ws_broadcast = crate::ws::messages::Broadcast {
                session_id: msg.session_id.to_string(),
                message: ws_message,
                exclude_client_id: msg.exclude_client,
            };

            // Send to WebSocket session manager
            ws_manager.do_send(ws_broadcast);
            log::debug!("Message forwarded to WebSocket clients");
        }
    }
}

// Handler for WebSocket ServerMessage to forward to SSE clients
impl Handler<WsServerMessage> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: WsServerMessage, ctx: &mut Context<Self>) {
        // Get current timestamp
        let now = chrono::Utc::now().timestamp();

        // Convert WebSocket message to SSE message format
        let sse_message = ServerMessage {
            message_type: msg.message_type.clone(),
            data: msg.data.clone(),
            timestamp: now,
        };

        // We need to know which session this is for
        // Check if the message data contains a session_id field
        if let Some(session_id) = msg.data.get("session_id").and_then(|v| v.as_str()) {
            debug!(
                "Forwarding WebSocket message to SSE clients for session {}",
                session_id
            );

            // Store the event for polling clients
            self.store_recent_event(session_id, sse_message.clone());

            // If we have clients for this session, broadcast to them
            if let Some(clients) = self.sessions.get(session_id) {
                for client_id in clients {
                    if let Some(sender) = self.clients.get(client_id) {
                        if let Err(err) = sender.try_send(sse_message.clone()) {
                            error!(
                                "Failed to forward WebSocket message to SSE client {}: {:?}",
                                client_id, err
                            );
                        } else {
                            debug!("Forwarded WebSocket message to SSE client {}", client_id);
                        }
                    }
                }
            }
        } else {
            debug!(
                "Received WebSocket message to forward to SSE clients, but no session ID provided"
            );
        }
    }
}

// Add handler for GetRecentEvents
impl Handler<GetRecentEvents> for SessionManager {
    type Result = Result<Vec<ServerMessage>, std::io::Error>;

    fn handle(&mut self, msg: GetRecentEvents, _: &mut Context<Self>) -> Self::Result {
        let session_id = msg.session_id.clone();
        let client_id = msg.client_id.clone();
        let since_timestamp = msg.since_timestamp;

        debug!(
            "GetRecentEvents request from client {} for session {} since {}",
            client_id, session_id, since_timestamp
        );

        // Log the current state of recent_events
        debug!(
            "Current sessions with stored events: {:?}",
            self.recent_events.keys().collect::<Vec<_>>()
        );

        // Get recent events for this session
        let filtered_events = self.get_recent_events(&session_id, Some(since_timestamp));

        // Log the event types
        for (i, event) in filtered_events.iter().enumerate() {
            debug!(
                "Event {}: type={}, data={}, timestamp={}",
                i, event.message_type, event.data, event.timestamp
            );
        }

        // Return filtered events
        Ok(filtered_events)
    }
}

// Implementation of handler for GetSessionStatus message
impl Handler<GetSessionStatus> for SessionManager {
    type Result = SseSessionStatus;

    fn handle(&mut self, _msg: GetSessionStatus, _ctx: &mut Self::Context) -> Self::Result {
        let mut active_sessions = Vec::new();

        // Collect information about all sessions
        for (session_id, clients) in &self.sessions {
            let clients_vec: Vec<String> = clients.iter().cloned().collect();
            let event_count = self
                .recent_events
                .get(session_id)
                .map(|events| events.len())
                .unwrap_or(0);

            active_sessions.push(SessionInfo {
                session_id: session_id.clone(),
                client_count: clients.len(),
                clients: clients_vec,
                event_count,
            });
        }

        // Return the status information
        SseSessionStatus {
            active_sessions,
            total_clients: self.clients.len(),
            total_sessions: self.sessions.len(),
        }
    }
}

// Add handler for SendHeartbeat message
impl Handler<crate::sse::messages::SendHeartbeat> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: crate::sse::messages::SendHeartbeat, _: &mut Context<Self>) {
        let heartbeat = msg.message;
        let message_type = &heartbeat.message_type;

        // Get all active session IDs
        let session_ids: Vec<String> = self.sessions.keys().cloned().collect();

        if session_ids.is_empty() {
            info!("No active sessions for heartbeat, storing for future use");
            return;
        }

        info!(
            "Broadcasting heartbeat to {} active sessions",
            session_ids.len()
        );

        // For each active session, send the heartbeat directly
        for session_id in session_ids {
            // Store the event in this session's history
            self.store_recent_event(&session_id, heartbeat.clone());

            // Get the clients for this session
            if let Some(clients) = self.sessions.get(&session_id) {
                info!(
                    "Sending heartbeat to {} clients in session {}",
                    clients.len(),
                    session_id
                );

                for client_id in clients {
                    if let Some(client_sender) = self.clients.get(client_id) {
                        // Try to send the heartbeat
                        if let Err(e) = client_sender.try_send(heartbeat.clone()) {
                            error!("Failed to send heartbeat to client {}: {:?}", client_id, e);
                        } else {
                            debug!(
                                "❤️ Heartbeat sent to client {} in session {}",
                                client_id, session_id
                            );
                        }
                    }
                }
            }
        }
    }
}
