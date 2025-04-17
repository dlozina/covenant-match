use crate::models::chat::ChatMessage;
use crate::services::chat_service::ChatService;
use crate::ws::messages::{
    Broadcast, ChatHistoryMessage, Connect, Disconnect, GetChatHistory, ServerMessage,
};
use actix::prelude::*;
use log::{debug, error, info};
use mongodb::Database;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

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
}

impl Default for SessionManager {
    fn default() -> Self {
        Self {
            sessions: HashMap::new(),
            clients: HashMap::new(),
            user_mapping: HashMap::new(),
            chat_service: None,
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

                if let Some(chat_service) = self.chat_service.clone() {
                    let session_id = msg.session_id.clone();
                    let content = message_text.to_string();
                    let sender_id = sender_id.to_string();
                    let sender_name = sender_name.to_string();

                    // Spawn an async task to store the message
                    ctx.spawn(
                        async move {
                            let chat_message =
                                ChatMessage::new(session_id, sender_id, sender_name, content);

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
