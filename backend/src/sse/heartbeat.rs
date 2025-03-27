use actix::prelude::*;
use log::info;
use serde_json::json;
use std::time::Duration;

use crate::sse::messages::{SendHeartbeat, SendStaggeredHeartbeat, ServerMessage};
use crate::sse::session::SessionManager;

// Actor for sending periodic heartbeats to connected clients
pub struct HeartbeatActor {
    interval: Duration,
    sse_manager: Addr<SessionManager>,
    batch_count: u32,
    use_staggered_heartbeats: bool,
    sub_interval: Duration,
}

// Main heartbeat interval in seconds
const HEARTBEAT_INTERVAL: u64 = 30;
// Number of batches for staggered heartbeats
const DEFAULT_BATCH_COUNT: u32 = 4;
// If true, use staggered heartbeats instead of all-at-once
const USE_STAGGERED_HEARTBEATS: bool = true;

impl HeartbeatActor {
    pub fn new(sse_manager: Addr<SessionManager>) -> Self {
        let interval = Duration::from_secs(HEARTBEAT_INTERVAL);

        // For staggered heartbeats, we'll divide the main interval by the batch count
        // This ensures all batches get a heartbeat within the main interval
        let sub_interval = if USE_STAGGERED_HEARTBEATS {
            Duration::from_secs(HEARTBEAT_INTERVAL / DEFAULT_BATCH_COUNT as u64)
        } else {
            interval
        };

        Self {
            interval,
            sse_manager,
            batch_count: DEFAULT_BATCH_COUNT,
            use_staggered_heartbeats: USE_STAGGERED_HEARTBEATS,
            sub_interval,
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

        if self.use_staggered_heartbeats {
            self.send_staggered_heartbeats(ctx, message);
        } else {
            self.send_regular_heartbeat(message);
        }
    }

    // Send heartbeat to all sessions at once (original method)
    fn send_regular_heartbeat(&self, message: ServerMessage) {
        info!("❤️ Sending regular heartbeat to all connected sessions");

        // Send a special SendHeartbeat message to the SessionManager
        self.sse_manager.do_send(SendHeartbeat {
            message: message.clone(),
        });

        // Schedule next heartbeat at the main interval
        // Note: This is now handled by the send_heartbeat method
    }

    // Send heartbeats in a staggered way, batch by batch
    fn send_staggered_heartbeats(&self, ctx: &mut Context<Self>, message: ServerMessage) {
        info!(
            "Starting staggered heartbeat cycle (will send to {} batches)",
            self.batch_count
        );

        // Schedule the first batch immediately
        self.schedule_next_batch(ctx, 0, message);
    }

    // Schedule the next batch of heartbeats
    fn schedule_next_batch(&self, ctx: &mut Context<Self>, batch_id: u32, message: ServerMessage) {
        let message_clone = message.clone();
        let next_batch = (batch_id + 1) % self.batch_count;

        // Send the current batch
        info!(
            "❤️ Sending staggered heartbeat to batch {}/{}",
            batch_id + 1,
            self.batch_count
        );
        self.sse_manager.do_send(SendStaggeredHeartbeat {
            message: message_clone,
            batch_id,
        });

        if next_batch == 0 {
            // If we've gone through all batches, schedule the next full cycle at the main interval
            ctx.run_later(self.interval, |act, ctx| {
                act.send_heartbeat(ctx);
            });
        } else {
            // Otherwise, schedule the next batch at the sub-interval
            let batch_id_clone = next_batch;
            let message_clone = message.clone();
            ctx.run_later(self.sub_interval, move |act, ctx| {
                act.schedule_next_batch(ctx, batch_id_clone, message_clone);
            });
        }
    }
}

impl Actor for HeartbeatActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        if self.use_staggered_heartbeats {
            info!("HeartbeatActor started with STAGGERED heartbeats - main interval: {:?}, batch count: {}, sub-interval: {:?}",
                self.interval, self.batch_count, self.sub_interval);
        } else {
            info!(
                "HeartbeatActor started with REGULAR heartbeats - interval: {:?}",
                self.interval
            );
        }

        // Send first heartbeat
        self.send_heartbeat(ctx);
    }

    fn stopped(&mut self, _: &mut Context<Self>) {
        info!("HeartbeatActor stopped");
    }
}
