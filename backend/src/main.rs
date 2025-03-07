mod config;
mod models;
mod repository;
mod routes;
mod services;
mod middleware;
mod utils;

use actix_cors::Cors;
use actix_web::{App, HttpServer, middleware::Logger};
use actix_web::web::Data;
use log::info;
use mongodb::{Client, options::ClientOptions};
use crate::routes::{health, users, sessions, statistics};
use crate::config::get_config;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize environment logger
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));
    
    // Load configuration
    let config = get_config();
    let mongo_uri = std::env::var("MONGODB_URI").unwrap_or_else(|_| config.database_url.clone());
    let server_port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    
    // Connect to MongoDB
    info!("Connecting to MongoDB...");
    let client_options = ClientOptions::parse(&mongo_uri).await.expect("Failed to parse MongoDB connection string");
    let client = Client::with_options(client_options).expect("Failed to create MongoDB client");
    let db = client.database("covenant-match");
    
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
            .configure(health::config)
            .configure(users::config)
            .configure(sessions::config)
            .configure(statistics::config)
    })
    .bind(format!("0.0.0.0:{}", server_port))?
    .run()
    .await
}
