use actix::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tokio::sync::mpsc;

// Message sent from server to client
#[derive(Debug, Deserialize, Serialize, Message, Clone)]
#[rtype(result = "()")]
pub struct ServerMessage {
    pub message_type: String,
    pub data: Value,
    pub timestamp: i64,
}

// Message to connect a client to the session manager
#[derive(Message)]
#[rtype(result = "()")]
pub struct ConnectSSE {
    pub client_id: String,
    pub session_id: String,
    pub sender: mpsc::Sender<ServerMessage>,
}

// Message to disconnect a client from the session manager
#[derive(Message)]
#[rtype(result = "()")]
pub struct DisconnectSSE {
    pub client_id: String,
    pub session_id: String,
}

// Message to broadcast to all clients in a session
#[derive(Message)]
#[rtype(result = "()")]
pub struct BroadcastMessage {
    pub session_id: String,
    pub message: ServerMessage,
    pub exclude_client: Option<String>,
}

// New message to send heartbeats to all active sessions
#[derive(Message)]
#[rtype(result = "()")]
pub struct SendHeartbeat {
    pub message: ServerMessage,
}

// Message to request recent events for polling
#[derive(Message)]
#[rtype(result = "Result<Vec<ServerMessage>, std::io::Error>")]
pub struct GetRecentEvents {
    pub client_id: String,
    pub session_id: String,
    pub since_timestamp: i64,
}

// Message to get the status of sessions and clients
#[derive(Message)]
#[rtype(result = "SessionStatus")]
pub struct GetSessionStatus {}

// Status of all sessions and clients
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SessionStatus {
    pub active_sessions: Vec<SessionInfo>,
    pub total_clients: usize,
    pub total_sessions: usize,
}

// Implement MessageResponse for SessionStatus
impl<A, M> actix::dev::MessageResponse<A, M> for SessionStatus
where
    A: Actor,
    M: Message<Result = SessionStatus>,
{
    fn handle(self, _: &mut A::Context, tx: Option<actix::dev::OneshotSender<M::Result>>) {
        if let Some(tx) = tx {
            let _ = tx.send(self);
        }
    }
}

// Information about a session
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SessionInfo {
    pub session_id: String,
    pub client_count: usize,
    pub clients: Vec<String>,
    pub event_count: usize,
}
