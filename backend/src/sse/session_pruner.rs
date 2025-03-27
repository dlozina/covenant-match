use crate::sse::session::SessionManager;
use actix::prelude::*;
use log::info;
use std::time::Duration;

// Actor for pruning inactive sessions
pub struct SessionPrunerActor {
    interval: Duration,
    max_inactive_seconds: i64,
    sse_manager: Addr<SessionManager>,
}

impl SessionPrunerActor {
    pub fn new(
        sse_manager: Addr<SessionManager>,
        prune_interval_seconds: u64,
        max_inactive_seconds: i64,
    ) -> Self {
        let interval = Duration::from_secs(prune_interval_seconds);

        Self {
            interval,
            max_inactive_seconds,
            sse_manager,
        }
    }

    fn prune_inactive_sessions(&self, ctx: &mut Context<Self>) {
        // Create a message for the session manager to prune sessions
        self.sse_manager.do_send(PruneInactiveSessions {
            max_inactive_seconds: self.max_inactive_seconds,
        });

        // Schedule next pruning
        ctx.run_later(self.interval, |act, ctx| {
            act.prune_inactive_sessions(ctx);
        });
    }
}

impl Actor for SessionPrunerActor {
    type Context = Context<Self>;

    fn started(&mut self, ctx: &mut Context<Self>) {
        info!(
            "SessionPrunerActor started with interval: {:?}, max_inactive_seconds: {}",
            self.interval, self.max_inactive_seconds
        );

        // Start the pruning cycle
        self.prune_inactive_sessions(ctx);
    }

    fn stopped(&mut self, _: &mut Context<Self>) {
        info!("SessionPrunerActor stopped");
    }
}

// Define a message for session pruning
#[derive(Message)]
#[rtype(result = "()")]
pub struct PruneInactiveSessions {
    pub max_inactive_seconds: i64,
}
