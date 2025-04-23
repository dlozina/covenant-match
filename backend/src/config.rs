use actix_web::http::Method;
use config::{Config as ConfigLoader, Environment, File};
use log::{info, warn};
use once_cell::sync::Lazy;
use serde::Deserialize;
use std::path::Path;

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
pub struct RealtimeConfig {
    pub use_websockets: bool,
    pub session_inactive_timeout: u64,
}

#[derive(Debug, Deserialize)]
pub struct ChatConfig {
    pub cleanup_interval_minutes: u64,
    pub inactive_minutes: i64,
}

#[derive(Debug, Deserialize)]
pub struct Config {
    pub environment: String,
    pub database: DatabaseConfig,
    pub jwt: JwtConfig,
    pub server: ServerConfig,
    pub realtime: RealtimeConfig,
    pub chat: ChatConfig,
    pub auth: AuthConfig,
}

impl Config {
    fn new() -> Self {
        // Determine environment
        let env = std::env::var("RUST_ENV").unwrap_or_else(|_| "development".to_string());
        info!("Loading configuration for environment: {}", env);

        // Figure out the config directory path
        let config_dir = if Path::new("config").exists() {
            // Running from backend directory
            "config".to_string()
        } else if Path::new("backend/config").exists() {
            // Running from project root
            "backend/config".to_string()
        } else {
            // Docker or other environment - use absolute path
            std::env::var("CONFIG_DIR").unwrap_or_else(|_| "/app/config".to_string())
        };

        info!("Using config directory: {}", config_dir);

        // Check which config files actually exist and log them
        let default_config_path = format!("{}/default.toml", config_dir);
        let env_config_path = format!("{}/{}.toml", config_dir, env);
        let local_config_path = format!("{}/local.toml", config_dir);

        if Path::new(&default_config_path).exists() {
            info!("Found default config file: {}", default_config_path);
        } else {
            warn!("Default config file not found: {}", default_config_path);
        }

        if Path::new(&env_config_path).exists() {
            info!("Found environment config file: {}", env_config_path);
        } else {
            info!(
                "Environment config file not found (this is normal): {}",
                env_config_path
            );
        }

        if Path::new(&local_config_path).exists() {
            info!("Found local config file: {}", local_config_path);
        }

        // Base config file + environment-specific config file
        let config_builder = ConfigLoader::builder()
            // Start with default settings
            .add_source(File::with_name(&format!("{}/default", config_dir)).required(false))
            // Add environment-specific settings
            .add_source(File::with_name(&format!("{}/{}", config_dir, env)).required(false))
            // Add local config overrides
            .add_source(File::with_name(&format!("{}/local", config_dir)).required(false))
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
                    path: "/uploads/.*".to_string(),
                    method: Some("GET".to_string()),
                    is_regex: true,
                },
            ],
        };

        // Use hardcoded defaults that match default.toml
        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "malenia_is_the_best_girl_in_the_world".to_string());
        let jwt_expires_in = std::env::var("JWT_EXPIRES_IN").unwrap_or_else(|_| "12h".to_string());

        // When falling back to defaults, warn the user
        warn!("Using fallback configuration. This may not be what you want in production.");

        Self {
            environment: "development".to_string(),
            database: DatabaseConfig {
                url: std::env::var("MONGODB_URI")
                    .unwrap_or_else(|_| "mongodb://localhost:27017/covenant-match".to_string()),
            },
            jwt: JwtConfig {
                secret: jwt_secret,
                expires_in: jwt_expires_in,
            },
            server: ServerConfig {
                port: std::env::var("PORT")
                    .ok()
                    .and_then(|p| p.parse().ok())
                    .unwrap_or(8080),
                host: "0.0.0.0".to_string(),
                workers: 1,
            },
            realtime: RealtimeConfig {
                use_websockets: true,
                session_inactive_timeout: 86400,
            },
            chat: ChatConfig {
                cleanup_interval_minutes: 60,
                inactive_minutes: 60,
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

    pub fn use_websockets(&self) -> bool {
        self.realtime.use_websockets
    }

    pub fn session_inactive_timeout(&self) -> u64 {
        self.realtime.session_inactive_timeout
    }

    pub fn chat_cleanup_interval_minutes(&self) -> u64 {
        self.chat.cleanup_interval_minutes
    }

    pub fn chat_inactive_minutes(&self) -> i64 {
        self.chat.inactive_minutes
    }
}

static CONFIG: Lazy<Config> = Lazy::new(Config::new);

pub fn get_config() -> &'static Config {
    &CONFIG
}
