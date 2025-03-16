use crate::ws::messages::{Broadcast, Connect, Disconnect, ServerMessage};
use actix::prelude::*;
use log::{debug, error, info};
use std::collections::{HashMap, HashSet};

/// Actor that manages all active WebSocket sessions
pub struct SessionManager {
    // Map of session_id -> set of client_ids
    sessions: HashMap<String, HashSet<String>>,
    // Map of client_id -> client actor address
    clients: HashMap<String, Recipient<ServerMessage>>,
}

impl Default for SessionManager {
    fn default() -> Self {
        Self {
            sessions: HashMap::new(),
            clients: HashMap::new(),
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
        self.clients.insert(msg.client_id, msg.addr);

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
    }
}

// Handler for Broadcast message
impl Handler<Broadcast> for SessionManager {
    type Result = ();

    fn handle(&mut self, msg: Broadcast, _: &mut Context<Self>) {
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
                    },
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
