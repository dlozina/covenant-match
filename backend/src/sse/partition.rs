use actix::prelude::*;
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::hash::{Hash, Hasher};

use crate::sse::messages::*;
use crate::sse::session::SessionManager;
use crate::ws::messages::ServerMessage as WsServerMessage;

/// Number of partitions to divide the sessions across
pub const DEFAULT_PARTITION_COUNT: usize = 4;

/// Actor that routes messages to the appropriate session manager partition
/// based on the session ID
pub struct SessionRouter {
    // Vector of session manager actors, each handling a partition of sessions
    partitions: Vec<Addr<SessionManager>>,
    // WebSocket session manager address for dual broadcasting
    ws_session_manager: Option<Addr<crate::ws::session::SessionManager>>,
}

impl SessionRouter {
    /// Create a new session router with the specified number of partitions
    pub fn new(
        partition_count: usize,
        ws_session_manager: Option<Addr<crate::ws::session::SessionManager>>,
    ) -> Self {
        info!("Creating SessionRouter with {} partitions", partition_count);

        // Create partitions
        let mut partitions = Vec::with_capacity(partition_count);

        for i in 0..partition_count {
            let session_manager = if let Some(ref ws_manager) = ws_session_manager {
                // Create a session manager with WebSocket support
                info!("Creating partition {} with WebSocket support", i);
                SessionManager::new(ws_manager.clone()).start()
            } else {
                // Create a standalone session manager
                info!("Creating partition {} without WebSocket support", i);
                SessionManager::new_standalone().start()
            };

            partitions.push(session_manager);
        }

        Self {
            partitions,
            ws_session_manager,
        }
    }

    /// Calculate which partition a session belongs to
    fn get_partition_for_session(&self, session_id: &str) -> usize {
        // Use a simple hash function to determine the partition
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        session_id.hash(&mut hasher);
        let hash = hasher.finish();

        // Modulo to get partition index
        (hash as usize) % self.partitions.len()
    }

    /// Get all partitions
    fn get_all_partitions(&self) -> &Vec<Addr<SessionManager>> {
        &self.partitions
    }
}

impl Actor for SessionRouter {
    type Context = Context<Self>;

    fn started(&mut self, _: &mut Self::Context) {
        info!(
            "SessionRouter actor started with {} partitions",
            self.partitions.len()
        );
    }

    fn stopped(&mut self, _: &mut Self::Context) {
        info!("SessionRouter actor stopped");
    }
}

/// Handler for ConnectSSE message
impl Handler<ConnectSSE> for SessionRouter {
    type Result = ();

    fn handle(&mut self, msg: ConnectSSE, _: &mut Context<Self>) {
        let session_id = &msg.session_id;
        let partition_idx = self.get_partition_for_session(session_id);

        info!(
            "Routing ConnectSSE for session {} to partition {}",
            session_id, partition_idx
        );

        // Forward the message to the appropriate partition
        if let Some(partition) = self.partitions.get(partition_idx) {
            partition.do_send(msg);
        } else {
            error!("Invalid partition index: {}", partition_idx);
        }
    }
}

/// Handler for DisconnectSSE message
impl Handler<DisconnectSSE> for SessionRouter {
    type Result = ();

    fn handle(&mut self, msg: DisconnectSSE, _: &mut Context<Self>) {
        let session_id = &msg.session_id;
        let partition_idx = self.get_partition_for_session(session_id);

        debug!(
            "Routing DisconnectSSE for session {} to partition {}",
            session_id, partition_idx
        );

        // Forward the message to the appropriate partition
        if let Some(partition) = self.partitions.get(partition_idx) {
            partition.do_send(msg);
        } else {
            error!("Invalid partition index: {}", partition_idx);
        }
    }
}

/// Handler for BroadcastMessage
impl Handler<BroadcastMessage> for SessionRouter {
    type Result = ();

    fn handle(&mut self, msg: BroadcastMessage, _: &mut Context<Self>) {
        let session_id = &msg.session_id;

        // Special case for "all" sessions - broadcast to ALL partitions
        if session_id == "all" {
            info!("Broadcasting message to ALL sessions across ALL partitions");

            for (i, partition) in self.partitions.iter().enumerate() {
                debug!("Broadcasting to partition {}", i);
                partition.do_send(msg.clone());
            }
            return;
        }

        // Otherwise, route to the specific partition for this session
        let partition_idx = self.get_partition_for_session(session_id);

        debug!(
            "Routing broadcast for session {} to partition {}",
            session_id, partition_idx
        );

        // Forward the message to the appropriate partition
        if let Some(partition) = self.partitions.get(partition_idx) {
            partition.do_send(msg);
        } else {
            error!("Invalid partition index: {}", partition_idx);
        }
    }
}

/// Handler for SendHeartbeat - sends to ALL partitions
impl Handler<SendHeartbeat> for SessionRouter {
    type Result = ();

    fn handle(&mut self, msg: SendHeartbeat, _: &mut Context<Self>) {
        info!("Routing heartbeat to ALL partitions");

        // Send the heartbeat to all partitions
        for (i, partition) in self.partitions.iter().enumerate() {
            debug!("Sending heartbeat to partition {}", i);
            partition.do_send(msg.clone());
        }
    }
}

/// Handler for SendStaggeredHeartbeat - sends to ALL partitions but preserves batch ID
impl Handler<SendStaggeredHeartbeat> for SessionRouter {
    type Result = ();

    fn handle(&mut self, msg: SendStaggeredHeartbeat, _: &mut Context<Self>) {
        info!(
            "Routing staggered heartbeat (batch {}) to partitions",
            msg.batch_id
        );

        // Only forward the staggered heartbeat to partitions with active sessions
        // This avoids unnecessary processing in each partition
        let mut forwarded = false;

        // Send the staggered heartbeat to all partitions
        // Each partition will filter the sessions based on the batch_id
        for (i, partition) in self.partitions.iter().enumerate() {
            debug!(
                "Sending staggered heartbeat batch {} to partition {}",
                msg.batch_id, i
            );
            partition.do_send(msg.clone());
            forwarded = true;
        }

        if !forwarded {
            debug!(
                "No partitions available for staggered heartbeat batch {}",
                msg.batch_id
            );
        }
    }
}

/// Handler for GetRecentEvents
impl Handler<GetRecentEvents> for SessionRouter {
    type Result = ResponseFuture<Result<Vec<ServerMessage>, std::io::Error>>;

    fn handle(&mut self, msg: GetRecentEvents, _: &mut Context<Self>) -> Self::Result {
        let session_id = msg.session_id.clone();
        let partition_idx = self.get_partition_for_session(&session_id);

        debug!(
            "Routing GetRecentEvents for session {} to partition {}",
            session_id, partition_idx
        );

        // Get the partition
        if let Some(partition) = self.partitions.get(partition_idx) {
            // Forward the message and return the future result
            let fut = partition.send(msg);

            // Map any actor errors to IO errors to maintain the result type
            Box::pin(async move {
                match fut.await {
                    Ok(result) => result,
                    Err(err) => {
                        error!("Failed to get recent events from partition: {}", err);
                        Err(std::io::Error::new(
                            std::io::ErrorKind::Other,
                            format!("Partition actor error: {}", err),
                        ))
                    }
                }
            })
        } else {
            error!("Invalid partition index: {}", partition_idx);
            // Return a future with an error
            Box::pin(async move {
                Err(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("Invalid partition index: {}", partition_idx),
                ))
            })
        }
    }
}

/// Message to collect status from all partitions
#[derive(Message)]
#[rtype(result = "SseSessionStatus")]
pub struct GetAllPartitionsStatus {}

/// Handler for GetSessionStatus - needs to aggregate from all partitions
impl Handler<GetSessionStatus> for SessionRouter {
    type Result = ResponseFuture<SseSessionStatus>;

    fn handle(&mut self, _: GetSessionStatus, _: &mut Context<Self>) -> Self::Result {
        info!("Getting status from all partitions");

        // Clone the partitions vec to move into the future
        let partitions = self.partitions.clone();

        // Query all partitions in parallel
        Box::pin(async move {
            // Create a vector of futures to get status from each partition
            let mut futures = Vec::with_capacity(partitions.len());

            for partition in partitions {
                futures.push(partition.send(GetSessionStatus {}));
            }

            // Wait for all futures to complete
            let results = futures::future::join_all(futures).await;

            // Aggregate the results
            let mut combined_status = SseSessionStatus {
                active_sessions: Vec::new(),
                total_clients: 0,
                total_sessions: 0,
            };

            for (i, result) in results.into_iter().enumerate() {
                match result {
                    Ok(status) => {
                        // Add this partition's stats to the combined stats
                        combined_status
                            .active_sessions
                            .extend(status.active_sessions);
                        combined_status.total_clients += status.total_clients;
                        combined_status.total_sessions += status.total_sessions;
                    }
                    Err(err) => {
                        error!("Failed to get status from partition {}: {}", i, err);
                    }
                }
            }

            combined_status
        })
    }
}

/// Handler for WebSocket ServerMessage to forward to SSE clients
impl Handler<WsServerMessage> for SessionRouter {
    type Result = ();

    fn handle(&mut self, msg: WsServerMessage, _: &mut Context<Self>) {
        // We need to know which session this is for
        if let Some(session_id) = msg.data.get("session_id").and_then(|v| v.as_str()) {
            let partition_idx = self.get_partition_for_session(session_id);

            debug!(
                "Routing WebSocket message for session {} to partition {}",
                session_id, partition_idx
            );

            // Forward to the appropriate partition
            if let Some(partition) = self.partitions.get(partition_idx) {
                partition.do_send(msg);
            } else {
                error!("Invalid partition index: {}", partition_idx);
            }
        } else {
            // No session ID in the message, log an error
            debug!("Received WebSocket message without session ID, cannot route");
        }
    }
}

/// Handler for PruneInactiveSessions - send to all partitions
impl Handler<crate::sse::session_pruner::PruneInactiveSessions> for SessionRouter {
    type Result = ();

    fn handle(
        &mut self,
        msg: crate::sse::session_pruner::PruneInactiveSessions,
        _: &mut Context<Self>,
    ) {
        info!("Routing pruning request to ALL partitions");

        // Send the pruning message to all partitions
        for (i, partition) in self.partitions.iter().enumerate() {
            debug!("Sending prune request to partition {}", i);
            partition.do_send(msg.clone());
        }
    }
}
