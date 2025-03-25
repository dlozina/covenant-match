use actix_web::http::Method;
use config::{Config as ConfigLoader, Environment, File};
use log::{info, warn};
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::path::Path;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct AuthConfig {
    pub exclude_patterns: Vec<ExcludePattern>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ExcludePattern {
    pub path: String,
    pub method: Option<String>,
    pub is_regex: bool,
}

impl ExcludePattern {
    pub fn get_method(&self) -> Option<Method> {
        self.method.as_ref().map(|m| match m.as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            "PATCH" => Method::PATCH,
            _ => Method::GET, // Default to GET for unknown methods
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct JwtConfig {
    pub secret: String,
    pub expires_in: String,
}

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
    pub workers: usize,
}

#[derive(Debug, Deserialize)]
pub struct Config {
    pub environment: String,
    pub database: DatabaseConfig,
    pub jwt: JwtConfig,
    pub server: ServerConfig,
    pub auth: AuthConfig,
}

impl Config {
    fn new() -> Self {
        // Determine environment
        let env = std::env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string());
        info!("Loading configuration for environment: {}", env);

        // Base config file + environment-specific config file
        let config_builder = ConfigLoader::builder()
            // Start with default settings
            .add_source(File::with_name("backend/config/default").required(false))
            // Add environment-specific settings
            .add_source(File::with_name(&format!("backend/config/{}", env)).required(false))
            // Add local config overrides
            .add_source(File::with_name("backend/config/local").required(false))
            // Override with environment variables
            // Environment variables take the form of CONFIG_SECTION__KEY=value
            // e.g., CONFIG_DATABASE__URL=mongodb://localhost:27017
            .add_source(Environment::with_prefix("CONFIG").separator("__"))
            .build();

        let config_builder = match config_builder {
            Ok(builder) => builder,
            Err(e) => {
                warn!("Failed to build config: {}. Using defaults.", e);
                return Self::default();
            }
        };

        // Try to deserialize the entire config
        match config_builder.try_deserialize::<Config>() {
            Ok(config) => {
                info!("Configuration loaded successfully");
                config
            }
            Err(e) => {
                warn!("Failed to deserialize config: {}. Using defaults.", e);
                Self::default()
            }
        }
    }

    fn default() -> Self {
        // Default auth config with common exclusion patterns
        let auth_config = AuthConfig {
            exclude_patterns: vec![
                ExcludePattern {
                    path: "/api/v1/auth/login".to_string(),
                    method: Some("POST".to_string()),
                    is_regex: false,
                },
                ExcludePattern {
                    path: "/api/v1/register".to_string(),
                    method: Some("POST".to_string()),
                    is_regex: false,
                },
                ExcludePattern {
                    path: "/api/docs/.*".to_string(),
                    method: Some("GET".to_string()),
                    is_regex: true,
                },
                ExcludePattern {
                    path: "/api-docs/.*".to_string(),
                    method: Some("GET".to_string()),
                    is_regex: true,
                },
                ExcludePattern {
                    path: "/api/v1/game-data".to_string(),
                    method: Some("GET".to_string()),
                    is_regex: false,
                },
                ExcludePattern {
                    path: "/api/v1/sse/status".to_string(),
                    method: Some("GET".to_string()),
                    is_regex: false,
                },
            ],
        };

        Self {
            environment: "development".to_string(),
            database: DatabaseConfig {
                url: std::env::var("MONGODB_URI")
                    .unwrap_or_else(|_| "mongodb://localhost:27017/covenant-match".to_string()),
            },
            jwt: JwtConfig {
                secret: std::env::var("JWT_SECRET")
                    .unwrap_or_else(|_| "your_jwt_secret_key".to_string()),
                expires_in: std::env::var("JWT_EXPIRES_IN").unwrap_or_else(|_| "60m".to_string()),
            },
            server: ServerConfig {
                port: std::env::var("PORT")
                    .ok()
                    .and_then(|p| p.parse().ok())
                    .unwrap_or(8080),
                host: "0.0.0.0".to_string(),
                workers: 1,
            },
            auth: auth_config,
        }
    }

    // Convenience methods to access config values
    pub fn database_url(&self) -> &str {
        &self.database.url
    }

    pub fn jwt_secret(&self) -> &str {
        &self.jwt.secret
    }

    pub fn jwt_expires_in(&self) -> &str {
        &self.jwt.expires_in
    }

    pub fn server_port(&self) -> u16 {
        self.server.port
    }

    pub fn server_host(&self) -> &str {
        &self.server.host
    }

    pub fn workers(&self) -> usize {
        self.server.workers
    }
}

static CONFIG: Lazy<Config> = Lazy::new(|| Config::new());

pub fn get_config() -> &'static Config {
    &CONFIG
}
