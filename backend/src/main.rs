mod config;
mod db;
mod middleware;
mod models;
mod openapi;
mod repository;
mod routes;
mod services;
mod sse;
mod utils;
mod ws;

use crate::config::get_config;
use crate::routes::{admin, health, news, statistics, users};
use actix::Actor;
use actix_cors::Cors;
use actix_files;
use actix_web::web::Data;
use actix_web::{middleware::Logger, App, HttpServer};
use dotenv::dotenv;
use log::{info, warn};
use middleware::auth::Auth;
use mongodb::{options::ClientOptions, Client};
use routes::{game_data, sessions};
use services::{auth_service, chat_service, session_service, user_service};
use sse::heartbeat::HeartbeatActor;
use sse::partition::{SessionRouter, DEFAULT_PARTITION_COUNT};
use sse::session_pruner::SessionPrunerActor;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::task;
use utoipa_swagger_ui::SwaggerUi;
use ws::session::SessionManager as WsSessionManager;

/// Starts a background task to periodically clean up old login attempts
fn start_login_attempts_cleanup(db: mongodb::Database) {
    let db = Arc::new(Mutex::new(db));

    task::spawn(async move {
        let cleanup_interval_hours = std::env::var("LOGIN_ATTEMPTS_CLEANUP_INTERVAL_HOURS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(24); // Default: run once per day

        loop {
            // Sleep first to avoid cleanup immediately on startup
            tokio::time::sleep(Duration::from_secs(cleanup_interval_hours * 60 * 60)).await;

            info!("Running scheduled cleanup of old login attempts");
            let db_lock = db.lock().await;

            match auth_service::cleanup_old_attempts(&db_lock).await {
                Ok(count) => info!("Cleaned up {} old login attempt records", count),
                Err(e) => warn!("Failed to clean up old login attempts: {:?}", e),
            }

            // Release the lock
            drop(db_lock);
        }
    });
}

/// Starts a background task to periodically clean up inactive chat sessions
fn start_chat_cleanup(chat_service: Arc<chat_service::ChatService>) {
    task::spawn(async move {
        let config = get_config();
        let cleanup_interval_minutes = config.chat_cleanup_interval_minutes();
        let inactive_minutes = config.chat_inactive_minutes();

        loop {
            // Sleep first to avoid cleanup immediately on startup
            tokio::time::sleep(Duration::from_secs(cleanup_interval_minutes * 60)).await;

            info!("Running scheduled cleanup of inactive chat sessions");

            match chat_service
                .cleanup_inactive_sessions(inactive_minutes)
                .await
            {
                Ok(_) => info!(
                    "Cleaned up inactive chat sessions (older than {} minutes)",
                    inactive_minutes
                ),
                Err(e) => warn!("Failed to clean up inactive chat sessions: {:?}", e),
            }
        }
    });
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env file if it exists
    dotenv().ok();

    // Initialize environment logger
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    // Load configuration
    let config = get_config();
    info!("Running in {} environment", config.environment);

    // Get the MongoDB connection string
    let mongo_uri =
        std::env::var("MONGODB_URI").unwrap_or_else(|_| config.database_url().to_string());

    // Check for JWT_SECRET
    if config.jwt_secret() == "your_jwt_secret_key"
        || config.jwt_secret() == "default_jwt_secret_key_change_me_in_production"
    {
        if config.environment == "production" || config.environment == "docker" {
            warn!(
                "JWT_SECRET not properly set in {} environment! Set CONFIG_JWT__SECRET env var.",
                config.environment
            );
        } else {
            warn!(
                "Using default JWT secret. This is OK for development but insecure for production!"
            );
        }
    }

    // Connect to MongoDB
    info!("Connecting to MongoDB at: {}", mongo_uri);
    let client_options = ClientOptions::parse(&mongo_uri)
        .await
        .expect("Failed to parse MongoDB connection string");
    let client = Client::with_options(client_options).expect("Failed to create MongoDB client");

    // Test the connection
    client
        .list_database_names()
        .await
        .expect("Failed to connect to MongoDB");
    info!("Successfully connected to MongoDB!");

    let db = client.database("covenant-match");

    // Start the periodic cleanup of old login attempts
    start_login_attempts_cleanup(db.clone());
    info!("Started periodic cleanup task for login attempts");

    // Initialize database with error handling
    info!("About to initialize database and seed data...");
    if let Err(e) = db::db_init::initialize_database(&db).await {
        warn!("Failed to initialize database: {:?}", e);
    }
    info!("Database initialization completed");

    // Create admin user if it doesn't exist yet
    if let Err(e) = user_service::ensure_admin_exists(&db).await {
        warn!("Failed to create admin user: {:?}", e);
    }

    // Optional: Check if users collection exists
    let collections = db
        .list_collection_names()
        .await
        .expect("Failed to list collections");

    if !collections.contains(&"users".to_string()) {
        info!("Users collection doesn't exist yet - it will be created on first user registration");
    }

    // Check if we should use WebSockets or SSE
    let use_websockets = get_config().use_websockets();
    let inactive_timeout = i64::try_from(get_config().session_inactive_timeout()).unwrap_or(86400); // Default to 24 hours if conversion fails

    info!(
        "Realtime configuration: use_websockets = {}, inactive_timeout = {} seconds",
        use_websockets, inactive_timeout
    );

    // Initialize either WebSockets or SSE based on configuration
    let sse_router = if use_websockets {
        None
    } else {
        // Initialize SSE (Server-Sent Events)
        info!("Initializing SSE for real-time communications");
        let router = SessionRouter::new(DEFAULT_PARTITION_COUNT, None).start();

        // Start the session pruner with configurable interval
        let _session_pruner = SessionPrunerActor::new(
            router.clone(),
            3600,             // Run every hour
            inactive_timeout, // Prune sessions inactive for configured time
        )
        .start();

        // Start the HeartbeatActor to send periodic heartbeat events
        let _heartbeat_actor = HeartbeatActor::new(router.clone()).start();

        // Register the router with the session service
        session_service::set_sse_router(router.clone());

        Some(router)
    };

    // Initialize WebSocket session manager if needed
    let ws_session_manager = if use_websockets {
        info!("Initializing WebSockets for real-time communications");

        // Initialize chat service
        let chat_service = Arc::new(chat_service::ChatService::new(&db));
        info!("Chat service initialized");

        // Create session manager with chat service
        let session_manager = WsSessionManager::new(Some(chat_service.clone())).start();

        // Register the WebSocket session manager with the session service
        session_service::set_session_manager(session_manager.clone());

        Some((session_manager, chat_service))
    } else {
        None
    };

    // Start the periodic cleanup of inactive chat sessions
    if let Some((_, chat_service)) = &ws_session_manager {
        start_chat_cleanup(chat_service.clone());
        info!("Started periodic cleanup task for inactive chat sessions");
    }

    info!(
        "Starting HTTP server on {}:{}",
        get_config().server_host(),
        get_config().server_port()
    );

    let app = HttpServer::new(move || {
        // Configure CORS
        let cors = Cors::default()
            .allow_any_origin() // For development - restrict in production
            .allow_any_method()
            .allow_any_header()
            .expose_headers(vec!["content-disposition"])
            .supports_credentials()
            .max_age(3600);

        let mut app = App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(Data::new(db.clone()))
            // Register routes directly (not inside a scope) -> scope has issues
            .wrap(Auth::user())
            .configure(health::config)
            .configure(users::config)
            .configure(sessions::config)
            .configure(game_data::config)
            .configure(statistics::config)
            .configure(routes::user_data::config)
            .configure(admin::config)
            .configure(news::config)
            // Add Swagger UI with the OpenAPI schema from our new module
            .service(
                SwaggerUi::new("/api/docs/{_:.*}")
                    .url("/api-docs/openapi.json", openapi::get_openapi()),
            )
            // Serve static files from the uploads directory
            .service(actix_files::Files::new("/uploads", "uploads"));

        // Conditionally add SSE or WebSocket routes based on config
        if let Some(router) = &sse_router {
            app = app
                .app_data(Data::new(router.clone()))
                .configure(routes::sse::config);
        }

        if let Some((manager, chat_service)) = &ws_session_manager {
            app = app
                .app_data(Data::new(manager.clone()))
                .app_data(Data::new(chat_service.clone()))
                .configure(routes::ws::config);
        }

        app
    });

    app.workers(get_config().workers())
        .bind(format!(
            "{}:{}",
            get_config().server_host(),
            get_config().server_port()
        ))?
        .run()
        .await
}
