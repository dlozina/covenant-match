use actix::prelude::*;
use log::info;
use serde_json::json;
use std::time::Duration;

use crate::sse::messages::ServerMessage;
use crate::sse::session::SessionManager;

// Actor for sending periodic heartbeats to connected clients
pub struct HeartbeatActor {
    interval: Duration,
    sse_manager: Addr<SessionManager>,
}

impl HeartbeatActor {
    pub fn new(sse_manager: Addr<SessionManager>, interval_seconds: u64) -> Self {
        // Default to 3 seconds if not specified (more frequent to prevent timeouts)
        let interval = if interval_seconds == 0 {
            Duration::from_secs(3)
        } else {
            Duration::from_secs(interval_seconds)
        };

        Self {
            interval,
            sse_manager,
        }
    }

    fn send_heartbeat(&self, ctx: &mut Context<Self>) {
        let timestamp = chrono::Utc::now().timestamp();
        let formatted_time = chrono::Utc::now().format("%H:%M:%S").to_string();
        let sequence_id = format!("{}", timestamp % 1000); // Last 3 digits of timestamp

        // Create the heartbeat message
        let message = ServerMessage {
            message_type: "heartbeat".to_string(),
            data: json!({
                "timestamp": timestamp,
                "formatted_time": formatted_time,
                "message": "❤️ Server heartbeat pulse",
                "sequence": sequence_id
            }),
            timestamp,
        };

        // Send heartbeat to all sessions
        info!(
            "❤️ Sending heartbeat #{} at {} to all connected sessions (direct)",
            sequence_id, formatted_time
        );

        // Send a special SendHeartbeat message to the SessionManager
        // This is a new message type we're creating to handle heartbeats properly
        self.sse_manager
            .do_send(crate::sse::messages::SendHeartbeat {
                message: message.clone(),
            });

        // Schedule next heartbeat
        ctx.run_later(self.interval, |act, ctx| {
            act.send_heartbeat(ctx);
        });
    }
}

impl Actor for HeartbeatActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        info!("HeartbeatActor started with interval: {:?}", self.interval);

        // Send first heartbeat
        self.send_heartbeat(ctx);
    }

    fn stopped(&mut self, _: &mut Context<Self>) {
        info!("HeartbeatActor stopped");
    }
}
