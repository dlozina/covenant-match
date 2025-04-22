use actix::prelude::*;
use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use log::{debug, error, info, warn};
use serde_json::json;
use std::time::{Duration, Instant};

use crate::utils::jwt;
use crate::ws::messages::{Broadcast, ClientMessage, Connect, Disconnect, ServerMessage};
use crate::ws::session::SessionManager;

// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

/// WebSocket connection actor
pub struct WsSession {
    /// Unique client id
    client_id: String,
    /// Session id this client is connected to
    session_id: String,
    /// Client must send ping at least once per 10 seconds (`CLIENT_TIMEOUT`),
    /// otherwise we drop connection.
    hb: Instant,
    /// Session manager actor address
    session_manager: Addr<SessionManager>,
}

impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;

    /// Method is called on actor start.
    /// We register ws session with `SessionManager`
    fn started(&mut self, ctx: &mut Self::Context) {
        // Start heartbeat process
        self.hb(ctx);

        // Register self in session manager
        let addr = ctx.address();
        self.session_manager
            .send(Connect {
                client_id: self.client_id.clone(),
                addr: addr.recipient(),
                session_id: self.session_id.clone(),
                user_id: Some(self.client_id.clone()),
            })
            .into_actor(self)
            .then(|res, _, ctx| {
                match res {
                    Ok(()) => debug!("Connected to session manager"),
                    Err(e) => {
                        error!("Failed to connect to session manager: {:?}", e);
                        ctx.stop();
                    }
                }
                fut::ready(())
            })
            .wait(ctx);
    }

    fn stopping(&mut self, _: &mut Self::Context) -> Running {
        // Notify session manager
        self.session_manager.do_send(Disconnect {
            client_id: self.client_id.clone(),
            session_id: self.session_id.clone(),
        });
        Running::Stop
    }
}

/// Handler for `ws::Message`
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                self.hb = Instant::now();
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                self.hb = Instant::now();
            }
            Ok(ws::Message::Text(text)) => {
                debug!("Received text message: {}", text);

                // Try to parse the message
                match serde_json::from_str::<ClientMessage>(&text) {
                    Ok(client_msg) => {
                        // Handle different message types
                        match client_msg.message_type.as_str() {
                            "ping" => {
                                // Respond with pong
                                let response = ServerMessage {
                                    message_type: "pong".to_string(),
                                    data: json!({"timestamp": chrono::Utc::now().timestamp()}),
                                };
                                ctx.text(
                                    serde_json::to_string(&response)
                                        .expect("Failed to serialize pong response"),
                                );
                            }
                            "chat" => {
                                // Forward chat message to all clients in the session
                                if let Some(message) = client_msg.data.get("message") {
                                    if let Some(message_str) = message.as_str() {
                                        // Extract client_id if provided
                                        let client_id_value = client_msg
                                            .data
                                            .get("clientId")
                                            .and_then(|v| v.as_str())
                                            .map(ToString::to_string);

                                        // Extract username if provided
                                        let username = client_msg
                                            .data
                                            .get("username")
                                            .and_then(|v| v.as_str())
                                            .map(ToString::to_string);

                                        // Create message data with sender information
                                        let mut message_data = json!({
                                            "userId": self.client_id,
                                            "message": message_str,
                                            "timestamp": chrono::Utc::now().timestamp()
                                        });

                                        // Add client_id to the message data if available
                                        if let Some(client_id) = client_id_value {
                                            message_data
                                                .as_object_mut()
                                                .expect(
                                                    "Failed to mutate message_data for client_id",
                                                )
                                                .insert("clientId".to_string(), json!(client_id));
                                        }

                                        // Add username to the message data if available
                                        if let Some(username) = username {
                                            message_data
                                                .as_object_mut()
                                                .expect(
                                                    "Failed to mutate message_data for username",
                                                )
                                                .insert("username".to_string(), json!(username));
                                        }

                                        let server_msg = ServerMessage {
                                            message_type: "chat".to_string(),
                                            data: message_data,
                                        };

                                        // Broadcast to all clients in this session
                                        self.session_manager.do_send(Broadcast {
                                            session_id: self.session_id.clone(),
                                            message: server_msg,
                                            exclude_client_id: None, // Include all clients
                                        });
                                    } else {
                                        warn!("Chat message is not a string");
                                    }
                                } else {
                                    warn!("Chat message is missing 'message' field");
                                }
                            }
                            // Add more message types as needed
                            _ => {
                                warn!("Unknown message type: {}", client_msg.message_type);
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to parse client message: {:?}", e);
                    }
                }
            }
            Ok(ws::Message::Binary(_)) => {
                warn!("Binary messages are not supported");
            }
            Ok(ws::Message::Close(reason)) => {
                debug!("Client disconnected: {:?}", reason);
                ctx.close(reason);
                ctx.stop();
            }
            Ok(ws::Message::Continuation(_)) => {
                warn!("Continuation messages are not supported");
            }
            Ok(ws::Message::Nop) => {}
            Err(e) => {
                error!("WebSocket protocol error: {:?}", e);
                ctx.stop();
            }
        }
    }
}

/// Handler for `ServerMessage`
impl Handler<ServerMessage> for WsSession {
    type Result = ();

    fn handle(&mut self, msg: ServerMessage, ctx: &mut Self::Context) {
        // Serialize and send the message to the client
        match serde_json::to_string(&msg) {
            Ok(json) => ctx.text(json),
            Err(e) => error!("Failed to serialize server message: {:?}", e),
        }
    }
}

impl WsSession {
    /// Helper method that sends ping to client every 5 seconds (`HEARTBEAT_INTERVAL`).
    /// Also checks if client has responded within 10 seconds (`CLIENT_TIMEOUT`).
    fn hb(&self, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            // Check client heartbeat
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                warn!("Client heartbeat failed, disconnecting!");
                ctx.stop();
                return;
            }

            ctx.ping(b"");
        });
    }
}

/// WebSocket handshake and start actor
pub async fn ws_route(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<String>,
    session_manager: web::Data<Addr<SessionManager>>,
) -> Result<HttpResponse, Error> {
    let session_id = path.into_inner();

    // Extract token from query parameters
    let query = req.query_string();
    let token = query
        .split('&')
        .find(|s| s.starts_with("token="))
        .map(|s| s.trim_start_matches("token="));

    // Validate token
    if let Some(token) = token {
        match jwt::validate_token(token) {
            Ok(claims) => {
                info!("WebSocket connection authorized for user: {}", claims.sub);

                // Create session actor
                let ws_session = WsSession {
                    client_id: claims.sub,
                    session_id,
                    hb: Instant::now(),
                    session_manager: session_manager.get_ref().clone(),
                };

                // Start WebSocket actor
                return ws::start(ws_session, &req, stream);
            }
            Err(e) => {
                error!("Token verification failed: {:?}", e);
                return Err(actix_web::error::ErrorUnauthorized("Invalid token"));
            }
        }
    }

    Err(actix_web::error::ErrorUnauthorized("Missing token"))
}
