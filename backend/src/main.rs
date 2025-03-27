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
use crate::routes::{health, users};
use actix::Actor;
use actix_cors::Cors;
use actix_web::web::Data;
use actix_web::{middleware::Logger, App, HttpServer};
use dotenv::dotenv;
use log::{info, warn};
use middleware::auth::Auth;
use mongodb::{options::ClientOptions, Client};
use routes::{game_data, sessions};
use services::{auth_service, session_service, user_service};
use sse::heartbeat::HeartbeatActor;
use sse::session::SessionManager as SseSessionManager;
use sse::session_pruner::SessionPrunerActor;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::task;
use utoipa_swagger_ui::SwaggerUi;

/// Starts a background task to periodically clean up old login attempts
async fn start_login_attempts_cleanup(db: mongodb::Database) {
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
    start_login_attempts_cleanup(db.clone()).await;
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

    // Start SSE session manager actor (standalone without WebSocket)
    let sse_session_manager = SseSessionManager::new_standalone().start();

    // Start the session pruner with a 1-hour interval and 24-hour max inactivity
    let _session_pruner = SessionPrunerActor::new(
        sse_session_manager.clone(),
        3600,  // Run every hour
        7200, // Prune sessions inactive for 2 hours
    )
    .start();

    // Start the HeartbeatActor to send periodic heartbeat events
    let _heartbeat_actor = HeartbeatActor::new(sse_session_manager.clone()).start();
    info!("Heartbeat actor started with interval defined in heartbeat.rs");

    // Set the SSE session manager in the session service
    session_service::set_sse_session_manager(sse_session_manager.clone());
    info!("SSE session manager initialized");

    info!(
        "Starting HTTP server on {}:{}",
        config.server_host(),
        config.server_port()
    );
    HttpServer::new(move || {
        // Configure CORS
        let cors = Cors::default()
            .allow_any_origin() // For development - restrict in production
            .allow_any_method()
            .allow_any_header()
            .expose_headers(vec!["content-disposition"])
            .supports_credentials()
            .max_age(3600);

        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(Data::new(db.clone()))
            .app_data(Data::new(sse_session_manager.clone()))
            // Register routes directly (not inside a scope) -> scope has issues
            .wrap(Auth::user())
            .configure(health::config)
            .configure(users::config)
            .configure(sessions::config)
            .configure(game_data::config)
            .configure(routes::sse::config)
            //TODO: Add statistics routes
            //.configure(statistics::config)
            // Add Swagger UI with the OpenAPI schema from our new module
            .service(
                SwaggerUi::new("/api/docs/{_:.*}")
                    .url("/api-docs/openapi.json", openapi::get_openapi()),
            )
    })
    .workers(config.workers())
    .bind(format!("{}:{}", config.server_host(), config.server_port()))?
    .run()
    .await
}
