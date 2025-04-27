use crate::models::chat::ChatMessage;
use crate::services::chat_service::ChatService;
use crate::ws::messages::{
    ActorMailboxInfo, Broadcast, ChatHistoryMessage, Connect, ConnectionStats,
    ConnectionsPerHourInfo, Disconnect, GetChatHistory, GetConnectionStats, ServerMessage,
    SessionConnectionInfo,
};
use actix::prelude::*;
use chrono::{DateTime, NaiveDateTime, Timelike, Utc};
use log::{debug, error, info};
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

/// Actor that manages all active WebSocket sessions
pub struct SessionManager {
    // Map of session_id -> set of client_ids
    sessions: HashMap<String, HashSet<String>>,
    // Map of client_id -> client actor address
    clients: HashMap<String, Recipient<ServerMessage>>,
    // Map of client_id -> user_id
    user_mapping: HashMap<String, String>,
    // Chat service for message persistence
    chat_service: Option<Arc<ChatService>>,
    // Metrics for connections
    connection_metrics: ConnectionMetrics,
}

/// Structure to store connection metrics
struct ConnectionMetrics {
    // Total connections since startup
    total_connections: u64,
    // Total connections today
    connections_today: u64,
    // When the day started (to reset counters at midnight)
    day_start: DateTime<Utc>,
    // Total messages processed
    total_messages: u64,
    // Connection history by hour for the last 24 hours
    connections_per_hour: VecDeque<(DateTime<Utc>, u32)>,
    // Message processing rates
    messages_processed: HashMap<String, u64>,
    // Message processing timestamps for rate calculation
    message_timestamps: HashMap<String, VecDeque<SystemTime>>,
}

impl ConnectionMetrics {
    fn new() -> Self {
        let now = Utc::now();
        let day_start = now.date().and_hms_opt(0, 0, 0).unwrap_or(now);

        // Initialize the connections per hour with 24 empty slots
        let mut connections_per_hour = VecDeque::with_capacity(24);
        for i in 0..24 {
            let hour_dt = day_start + chrono::Duration::hours(i);
            connections_per_hour.push_back((hour_dt, 0));
        }

        Self {
            total_connections: 0,
            connections_today: 0,
            day_start,
            total_messages: 0,
            connections_per_hour,
            messages_processed: HashMap::new(),
            message_timestamps: HashMap::new(),
        }
    }

    fn record_connection(&mut self) {
        self.total_connections += 1;

        let now = Utc::now();

        // Check if we need to reset the daily counter
        if now.date() > self.day_start.date() {
            self.connections_today = 0;
            self.day_start = now.date().and_hms_opt(0, 0, 0).unwrap_or(now);

            // Reset the hourly counts for a new day
            self.connections_per_hour.clear();
            for i in 0..24 {
                let hour_dt = self.day_start + chrono::Duration::hours(i);
                self.connections_per_hour.push_back((hour_dt, 0));
            }
        }

        self.connections_today += 1;

        // Update connections per hour
        if let Some(pos) = self
            .connections_per_hour
            .iter()
            .position(|(dt, _)| dt.hour() == now.hour())
        {
            let (dt, count) = self.connections_per_hour.remove(pos).unwrap();
            self.connections_per_hour.insert(pos, (dt, count + 1));
        }
    }

    fn record_message(&mut self, actor_type: &str) {
        self.total_messages += 1;

        // Update message count for this actor type
        *self
            .messages_processed
            .entry(actor_type.to_string())
            .or_insert(0) += 1;

        // Record timestamp for rate calculation
        let now = SystemTime::now();
        let timestamps = self
            .message_timestamps
            .entry(actor_type.to_string())
            .or_insert_with(|| VecDeque::with_capacity(100));

        timestamps.push_back(now);

        // Keep only the last 100 timestamps for rate calculation
        if timestamps.len() > 100 {
            timestamps.pop_front();
        }
    }

    fn get_hourly_connections(&self) -> Vec<ConnectionsPerHourInfo> {
        self.connections_per_hour
            .iter()
            .map(|(dt, count)| ConnectionsPerHourInfo {
                hour: format!("{:02}:00", dt.hour()),
                count: *count,
            })
            .collect()
    }

    fn get_message_rates(&self) -> Vec<ActorMailboxInfo> {
        let now = SystemTime::now();

        self.message_timestamps
            .iter()
            .map(|(actor, timestamps)| {
                let mut rate = 0.0;

                if !timestamps.is_empty() {
                    // Count messages in the last second
                    let recent_count = timestamps
                        .iter()
                        .filter(|&ts| {
                            if let Ok(duration) = now.duration_since(*ts) {
                                duration.as_secs() < 10 // Messages in the last 10 seconds
                            } else {
                                false
                            }
                        })
                        .count();

                    // Calculate messages per second
                    rate = recent_count as f64 / 10.0;
                }

                ActorMailboxInfo {
                    actor: actor.clone(),
                    rate: (rate * 100.0).round() as u32, // Convert to integer (msgs/sec * 100)
                }
            })
            .collect()
    }
}

impl Default for SessionManager {
    fn default() -> Self {
        Self {
            sessions: HashMap::new(),
            clients: HashMap::new(),
            user_mapping: HashMap::new(),
            chat_service: None,
            connection_metrics: ConnectionMetrics::new(),
        }
    }
}

impl SessionManager {
    pub fn new(chat_service: Option<Arc<ChatService>>) -> Self {
        Self {
            sessions: HashMap::new(),
            clients: HashMap::new(),
            user_mapping: HashMap::new(),
            chat_service,
            connection_metrics: ConnectionMetrics::new(),
        }
    }
}

impl Actor for SessionManager {
    type Context = Context<Self>;

    fn started(&mut self, _: &mut Self::Context) {
        info!("SessionManager actor started");
    }

    fn stopped(&mut self, _: &mut Self::Context) {
        info!("SessionManager actor stopped");
    }
}

/// Handler for Connect message
impl Handler<Connect> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: Connect, _: &mut Context<Self>) {
        debug!(
            "Client {} connected to session {}",
            msg.client_id, msg.session_id
        );

        // Add client to session
        self.sessions
            .entry(msg.session_id.clone())
            .or_insert_with(HashSet::new)
            .insert(msg.client_id.clone());

        // Store client address
        self.clients.insert(msg.client_id.clone(), msg.addr);

        // Store user mapping if available
        if let Some(user_id) = msg.user_id {
            self.user_mapping.insert(msg.client_id.clone(), user_id);
        }

        // Log the number of clients in the session
        if let Some(clients) = self.sessions.get(&msg.session_id) {
            debug!(
                "Session {} now has {} clients",
                msg.session_id,
                clients.len()
            );
        }

        // Record the connection in metrics
        self.connection_metrics.record_connection();
    }
}

/// Handler for Disconnect message
impl Handler<Disconnect> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: Disconnect, _: &mut Context<Self>) {
        debug!(
            "Client {} disconnected from session {}",
            msg.client_id, msg.session_id
        );

        // Remove client from session
        if let Some(clients) = self.sessions.get_mut(&msg.session_id) {
            clients.remove(&msg.client_id);

            // If session is empty, remove it
            if clients.is_empty() {
                self.sessions.remove(&msg.session_id);
                debug!("Session {} removed (no clients left)", msg.session_id);
            } else {
                debug!(
                    "Session {} now has {} clients",
                    msg.session_id,
                    clients.len()
                );
            }
        }

        // Remove client address
        self.clients.remove(&msg.client_id);

        // Remove user mapping
        self.user_mapping.remove(&msg.client_id);
    }
}

// Handler for Broadcast message
impl Handler<Broadcast> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: Broadcast, ctx: &mut Context<Self>) {
        // Store chat message if this is a chat message
        if msg.message.message_type == "chat" {
            self.store_chat_message(&msg, ctx);
        }

        // Record the message in metrics
        self.connection_metrics.record_message("SessionManager");

        // First collect the clients to process to avoid borrow conflicts
        let mut to_process = Vec::new();

        // Get a list of clients to send to (avoiding the borrow checker issues)
        if let Some(clients) = self.sessions.get(&msg.session_id) {
            for client_id in clients {
                // Skip excluded client if specified
                if let Some(ref exclude_id) = msg.exclude_client_id {
                    if client_id == exclude_id {
                        continue;
                    }
                }

                to_process.push(client_id.clone());
            }
        }

        // Process all clients that need messages
        let mut clients_to_remove = Vec::new();

        for client_id in to_process {
            if let Some(client_addr) = self.clients.get(&client_id) {
                // Use try_send() which returns a Result with SendError
                match client_addr.try_send(msg.message.clone()) {
                    Ok(_) => {
                        // Message queued successfully
                        debug!("Message sent to client {}", client_id);
                    }
                    Err(err) => {
                        // Log the error
                        error!("Failed to send message to client {}: {:?}", client_id, err);

                        // Mark this client for removal
                        clients_to_remove.push(client_id);
                    }
                }
            }
        }

        // Clean up any disconnected clients
        for client_id in clients_to_remove {
            self.clients.remove(&client_id);
            if let Some(session_clients) = self.sessions.get_mut(&msg.session_id) {
                session_clients.remove(&client_id);
            }
        }
    }
}

// Handler for GetChatHistory message
impl Handler<GetChatHistory> for SessionManager {
    type Result = ResponseFuture<Vec<ChatHistoryMessage>>;

    fn handle(&mut self, msg: GetChatHistory, _: &mut Context<Self>) -> Self::Result {
        let chat_service = self.chat_service.clone();

        // Mark any pending messages as delivered for this user
        if let Some(user_id) = self.user_mapping.get(&msg.client_id).cloned() {
            if let Some(chat_service) = &self.chat_service {
                let chat_service = chat_service.clone();
                let session_id = msg.session_id.clone();
                let user_id = user_id.clone();

                actix::spawn(async move {
                    match chat_service
                        .mark_messages_delivered(&session_id, &user_id)
                        .await
                    {
                        Ok(count) => {
                            debug!(
                                "Marked {} messages as delivered for user {}",
                                count, user_id
                            );
                        }
                        Err(e) => {
                            error!("Failed to mark messages as delivered: {}", e);
                        }
                    }
                });
            }
        }

        // Return future that will provide chat history
        Box::pin(async move {
            let mut history = Vec::new();

            if let Some(chat_service) = chat_service {
                match chat_service
                    .get_chat_history(&msg.session_id, msg.limit)
                    .await
                {
                    Ok(messages) => {
                        // Convert to the response format
                        history = messages
                            .into_iter()
                            .map(|msg| ChatHistoryMessage {
                                sender_id: msg.sender_id,
                                sender_name: msg.sender_name,
                                message: msg.content,
                                timestamp: msg.timestamp.timestamp_millis(),
                                client_id: msg.client_id,
                            })
                            .collect();
                    }
                    Err(e) => {
                        error!("Failed to retrieve chat history: {}", e);
                    }
                }
            }

            history
        })
    }
}

/// Handler for GetConnectionStats message
impl Handler<GetConnectionStats> for SessionManager {
    type Result = MessageResult<GetConnectionStats>;

    fn handle(&mut self, _msg: GetConnectionStats, _: &mut Context<Self>) -> Self::Result {
        // Get the count of current connections
        let current_connections = self.clients.len() as u32;

        // Get the session distribution
        let mut session_connections = Vec::new();
        for (session_id, clients) in &self.sessions {
            session_connections.push(SessionConnectionInfo {
                session_id: session_id.clone(),
                count: clients.len() as u32,
            });
        }

        // Get connections per hour
        let connections_per_hour = self.connection_metrics.get_hourly_connections();

        // Get actor message rates
        let message_rates = self.connection_metrics.get_message_rates();

        // Create mailbox sizes (this is estimated since we don't have direct access to mailbox queues)
        let mailbox_sizes = vec![
            ActorMailboxInfo {
                actor: "SessionManager".to_string(),
                rate: 5, // Mock value since we can't get actual queue depth easily
            },
            ActorMailboxInfo {
                actor: "WsSession".to_string(),
                rate: (current_connections / 2), // Just an estimate
            },
        ];

        // Create the stats response
        let stats = ConnectionStats {
            current_connections,
            total_connections_today: self.connection_metrics.connections_today as u32,
            total_messages: self.connection_metrics.total_messages as u32,
            connections_per_hour,
            session_connections,
            mailbox_sizes,
            message_rates,
            actor_count: (self.clients.len() + 1) as u32, // Clients + SessionManager
        };

        MessageResult(stats)
    }
}

impl SessionManager {
    // Store a chat message in the database
    fn store_chat_message(&self, msg: &Broadcast, ctx: &mut Context<Self>) {
        // Extract the message data
        if let Ok(data) = serde_json::from_value::<serde_json::Map<String, serde_json::Value>>(
            msg.message.data.clone(),
        ) {
            if let (Some(message_text), Some(sender_id)) = (
                data.get("message").and_then(|v| v.as_str()),
                data.get("userId").and_then(|v| v.as_str()),
            ) {
                // Get sender name from data or use a default
                let sender_name = data
                    .get("username")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown User")
                    .to_string();

                // Extract client_id if present
                let client_id = data
                    .get("clientId")
                    .and_then(|v| v.as_str())
                    .map(String::from);

                if let Some(chat_service) = self.chat_service.clone() {
                    let session_id = msg.session_id.clone();
                    let content = message_text.to_string();
                    let sender_id = sender_id.to_string();
                    let sender_name = sender_name.to_string();

                    // Spawn an async task to store the message
                    ctx.spawn(
                        async move {
                            let chat_message = ChatMessage::new(
                                session_id,
                                sender_id,
                                sender_name,
                                content,
                                client_id,
                            );

                            match chat_service.save_message(&chat_message).await {
                                Ok(_) => {
                                    debug!("Chat message stored successfully");
                                }
                                Err(e) => {
                                    error!("Failed to store chat message: {}", e);
                                }
                            }
                        }
                        .into_actor(self),
                    );
                }
            }
        }
    }
}
