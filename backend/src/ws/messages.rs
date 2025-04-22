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
