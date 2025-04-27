use actix::prelude::*;
use serde::{Deserialize, Serialize};

// Message sent from client to server
#[derive(Debug, Deserialize, Serialize)]
pub struct ClientMessage {
    pub message_type: String,
    pub data: serde_json::Value,
}

// Message sent from server to client
#[derive(Debug, Deserialize, Serialize, Message, Clone)]
#[rtype(result = "()")]
pub struct ServerMessage {
    pub message_type: String,
    pub data: serde_json::Value,
}

// Message to connect a client to the session manager
#[derive(Message)]
#[rtype(result = "()")]
pub struct Connect {
    pub client_id: String,
    pub addr: Recipient<ServerMessage>,
    pub session_id: String,
    pub user_id: Option<String>,
}

// Message to disconnect a client from the session manager
#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    pub client_id: String,
    pub session_id: String,
}

// Message to broadcast to all clients in a session
#[derive(Message)]
#[rtype(result = "()")]
pub struct Broadcast {
    pub session_id: String,
    pub message: ServerMessage,
    pub exclude_client_id: Option<String>,
}

// Request for chat history
#[derive(Message)]
#[rtype(result = "Vec<ChatHistoryMessage>")]
pub struct GetChatHistory {
    pub session_id: String,
    pub client_id: String,
    pub user_id: String,
    pub limit: i64,
}

// Chat history message format for response
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatHistoryMessage {
    pub sender_id: String,
    pub sender_name: String,
    pub message: String,
    pub timestamp: i64,
    pub client_id: Option<String>,
}

// Request for connection statistics (for admin dashboard)
#[derive(Message)]
#[rtype(result = "ConnectionStats")]
pub struct GetConnectionStats;

// Information about connections per hour
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionsPerHourInfo {
    pub hour: String,
    pub count: u32,
}

// Information about session connections
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionConnectionInfo {
    pub session_id: String,
    pub count: u32,
}

// Information about actor mailbox
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ActorMailboxInfo {
    pub actor: String,
    pub rate: u32,
}

// Connection statistics response
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionStats {
    pub current_connections: u32,
    pub total_connections_today: u32,
    pub total_messages: u32,
    pub connections_per_hour: Vec<ConnectionsPerHourInfo>,
    pub session_connections: Vec<SessionConnectionInfo>,
    pub mailbox_sizes: Vec<ActorMailboxInfo>,
    pub message_rates: Vec<ActorMailboxInfo>,
    pub actor_count: u32,
}
