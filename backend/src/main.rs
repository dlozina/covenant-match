mod config;
mod middleware;
mod models;
mod openapi;
mod repository;
mod routes;
mod services;
mod utils;

use crate::config::get_config;
use crate::routes::{health, users};
use actix_cors::Cors;
use actix_web::web::Data;
use actix_web::{middleware::Logger, App, HttpServer};
use dotenv::dotenv;
use log::{info, warn};
use mongodb::{options::ClientOptions, Client};
use routes::sessions;
use services::user_service;
use utoipa_swagger_ui::SwaggerUi;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env file if it exists
    dotenv().ok();

    // Initialize environment logger
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    // Load configuration
    let config = get_config();
    let mongo_uri = std::env::var("MONGODB_URI").unwrap_or_else(|_| config.database_url.clone());
    let server_port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());

    // Check for JWT_SECRET environment variable
    if std::env::var("JWT_SECRET").is_err() {
        warn!("JWT_SECRET environment variable not set! Using default secret. This is insecure for production!");
    }

    // Connect to MongoDB
    info!("Connecting to MongoDB at: {}", mongo_uri);
    let client_options = ClientOptions::parse(&mongo_uri)
        .await
        .expect("Failed to parse MongoDB connection string");
    let client = Client::with_options(client_options).expect("Failed to create MongoDB client");

    // Test the connection
    client
        .list_database_names(None, None)
        .await
        .expect("Failed to connect to MongoDB");
    info!("Successfully connected to MongoDB!");

    let db = client.database("covenant-match");

    // Create admin user if it doesn't exist yet
    if let Err(e) = user_service::ensure_admin_exists(&db).await {
        warn!("Failed to create admin user: {:?}", e);
    }

    // Optional: Check if users collection exists
    let collections = db
        .list_collection_names(None)
        .await
        .expect("Failed to list collections");

    if !collections.contains(&"users".to_string()) {
        info!("Users collection doesn't exist yet - it will be created on first user registration");
    }

    info!("Starting HTTP server on port {}", server_port);
    HttpServer::new(move || {
        // Configure CORS
        let cors = Cors::default()
            .allow_any_origin() // For development - restrict in production
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(Logger::default())
            .wrap(cors)
            .app_data(Data::new(db.clone()))
            // Register routes
            .configure(users::config)
            .configure(health::config)
            .configure(sessions::config)
            //TODO: Add statistics routes
            //.configure(statistics::config)
            // Add Swagger UI with the OpenAPI schema from our new module
            .service(
                SwaggerUi::new("/api/docs/{_:.*}")
                    .url("/api-docs/openapi.json", openapi::get_openapi()),
            )
    })
    // TODO: make this configurable
    // Change in production
    .workers(1)
    .bind(format!("0.0.0.0:{}", server_port))?
    .run()
    .await
}