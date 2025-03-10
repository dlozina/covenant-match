mod config;
mod middleware;
mod models;
mod repository;
mod routes;
mod services;
mod utils;

use crate::config::get_config;
use crate::routes::{health, sessions, statistics, users};
use actix_cors::Cors;
use actix_web::web::Data;
use actix_web::{middleware::Logger, App, HttpServer};
use dotenv::dotenv;
use log::info;
use mongodb::{options::ClientOptions, Client};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

// Define the API documentation
#[derive(OpenApi)]
#[openapi(
    paths(
        // Health routes
        health::health_check_v1,
        health::health_check_v2,
        // User routes
        users::create_user,
        users::login,
        users::get_current_user,
        // Session routes
        // Add your session endpoints here
        // Statistics routes
        // Add your statistics endpoints here
    ),
    components(
        schemas(
            // User models
            models::user::User,
            models::user::CreateUserDto,
            models::user::UserResponse,
            models::user::LoginUserDto,
            models::user::UpdateUserDto,
            models::user::AuthResponse,
            // Add other models as needed
        )
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management endpoints"),
        (name = "sessions", description = "Session management endpoints"),
        (name = "statistics", description = "Statistics endpoints")
    )
)]
struct ApiDoc;

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
            //.configure(sessions::config)
            //.configure(statistics::config)
            // Add Swagger UI
            .service(
                SwaggerUi::new("/api/docs/{_:.*}").url("/api-docs/openapi.json", ApiDoc::openapi()),
            )
    })
    .bind(format!("0.0.0.0:{}", server_port))?
    .run()
    .await
}
