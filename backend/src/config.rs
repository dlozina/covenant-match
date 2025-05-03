use actix_web::http::Method;
use config::{Config as ConfigLoader, Environment, File};
use log::{debug, info, warn};
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
    pub email_secret: String,
    pub reset_password_secret: String,
    pub expires_in: String,
}

#[derive(Debug, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
    pub workers: usize,
}

#[derive(Debug, Deserialize)]
pub struct DomainConfig {
    pub primary: String,
    pub www: String,
    #[serde(default)]
    pub internal_service_name: Option<String>,
    pub allow_local: bool,
}

#[derive(Debug, Deserialize)]
pub struct RealtimeConfig {
    pub use_websockets: bool,
    pub session_inactive_timeout: u64,
}

#[derive(Debug, Deserialize)]
pub struct ChatConfig {
    pub cleanup_interval_seconds: u64,
    pub inactive_seconds: i64,
}

#[derive(Debug, Deserialize)]
pub struct EmailConfig {
    pub frontend_url: String,
    pub from_email: Option<String>,
    pub from_name: Option<String>,
    pub mailersend_url: String,
}

#[derive(Debug, Deserialize)]
pub struct Config {
    pub environment: String,
    pub database: DatabaseConfig,
    pub jwt: JwtConfig,
    pub server: ServerConfig,
    pub domain: DomainConfig,
    pub realtime: RealtimeConfig,
    pub chat: ChatConfig,
    pub auth: AuthConfig,
    pub email: EmailConfig,
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
        let default_config_path = format!("{config_dir}/default.toml");
        let env_config_path = format!("{config_dir}/{env}.toml");
        let local_config_path = format!("{config_dir}/local.toml");

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
            .add_source(File::with_name(&format!("{config_dir}/default")).required(false))
            // Add environment-specific settings
            .add_source(File::with_name(&format!("{config_dir}/{env}")).required(false))
            // Add local config overrides
            .add_source(File::with_name(&format!("{config_dir}/local")).required(false))
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

                // Log auth exclusion patterns for debugging
                if log::log_enabled!(log::Level::Debug) {
                    debug!("Auth exclusion patterns:");
                    for pattern in &config.auth.exclude_patterns {
                        let method = pattern.method.as_deref().unwrap_or("ANY");
                        debug!(
                            " - {} {} (regex: {})",
                            method, pattern.path, pattern.is_regex
                        );
                    }
                }

                config
            }
            Err(e) => {
                warn!("Failed to deserialize config: {}. Using defaults.", e);
                Self::default()
            }
        }
    }

    fn default() -> Self {
        // When falling back to defaults, warn the user
        warn!("Using fallback configuration. This may not be what you want in production.");

        Self {
            environment: env_or_default("RUST_ENV", "development"),
            database: DatabaseConfig {
                url: env_or_default("MONGODB_URI", "mongodb://localhost:27017/covenant-match"),
            },
            jwt: JwtConfig {
                secret: env_or_default("JWT_SECRET", "malenia_is_the_best_girl_in_the_world"),
                expires_in: env_or_default("JWT_EXPIRES_IN", "12h"),
                email_secret: env_or_default("EMAIL_SECRET", "promised_consort_radahn"),
                reset_password_secret: env_or_default("RESET_PASSWORD_SECRET", "dancing_lion_in_the_wind"),
            },
            server: ServerConfig {
                port: env_or_default_parse("PORT", 8080),
                host: "0.0.0.0".to_string(),
                workers: env_or_default_parse("WORKERS", 1),
            },
            domain: DomainConfig {
                primary: env_or_default("DOMAIN_PRIMARY", "example.com"),
                www: env_or_default("DOMAIN_WWW", "www.example.com"),
                internal_service_name: std::env::var("DOMAIN_INTERNAL").ok(),
                allow_local: env_or_default_parse("ALLOW_LOCAL_TESTING", false),
            },
            realtime: RealtimeConfig {
                use_websockets: env_or_default_parse("USE_WEBSOCKETS", true),
                session_inactive_timeout: env_or_default_parse("SESSION_INACTIVE_TIMEOUT", 86400),
            },
            chat: ChatConfig {
                cleanup_interval_seconds: env_or_default_parse("CHAT_CLEANUP_INTERVAL", 60),
                inactive_seconds: env_or_default_parse("CHAT_INACTIVE_SECONDS", 60),
            },
            email: EmailConfig {
                frontend_url: env_or_default("FRONTEND_URL", "http://localhost"),
                from_email: std::env::var("EMAIL_FROM").ok(),
                from_name: std::env::var("EMAIL_SENDER_NAME").ok(),
                mailersend_url: env_or_default("MAILERSEND_URL", "https://api.mailersend.com/v1/email" ),
            },
            auth: create_default_auth_config(),
        }
    }

    // Convenience methods to access config values
    pub fn database_url(&self) -> &str {
        &self.database.url
    }

    pub fn jwt_secret(&self) -> &str {
        &self.jwt.secret
    }

    pub fn email_secret(&self) -> &str {
        &self.jwt.email_secret
    }

    pub fn reset_password_secret(&self) -> &str {
        &self.jwt.reset_password_secret
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

    pub fn chat_cleanup_interval_seconds(&self) -> u64 {
        self.chat.cleanup_interval_seconds
    }

    pub fn chat_inactive_seconds(&self) -> i64 {
        self.chat.inactive_seconds
    }

    pub fn domain_primary(&self) -> &str {
        &self.domain.primary
    }

    pub fn domain_www(&self) -> &str {
        &self.domain.www
    }

    pub fn domain_internal_service(&self) -> Option<&str> {
        self.domain.internal_service_name.as_deref()
    }

    pub fn allow_local_testing(&self) -> bool {
        self.domain.allow_local
    }

    pub fn email_frontend_url(&self) -> &str {
        &self.email.frontend_url
    }

    pub fn email_from(&self) -> Option<&str> {
        self.email.from_email.as_deref()
    }

    pub fn email_sender_name(&self) -> Option<&str> {
        self.email.from_name.as_deref()
    }

    pub fn email_mailersend_url(&self) -> &str {
        &self.email.mailersend_url
    }
}

// Helper function to get environment variable or default string value
fn env_or_default(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

// Helper function to get environment variable or default parsed value
fn env_or_default_parse<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|val| val.parse::<T>().ok())
        .unwrap_or(default)
}

// Create the default auth configuration with common exclusion patterns
fn create_default_auth_config() -> AuthConfig {
    debug!("Creating default auth config with public API paths");

    let public_api_paths = vec![
        // Authentication endpoints
        ("/api/v1/auth/login", "POST", false),
        ("/api/v1/register", "POST", false),
        // Documentation
        ("/api/docs/.*", "GET", true),
        ("/api-docs/.*", "GET", true),
        // Game data and statistics
        ("/api/v1/game-data", "GET", false),
        ("/api/v1/statistics/leaderboard", "GET", false),
        ("/api/v1/statistics/covenants", "GET", false),
        ("/api/v1/statistics/sessions-stats", "GET", false),
        ("/api/v1/public/sessions", "GET", false),
        // Uploads
        ("/uploads/.*", "GET", true),
        // News and announcements
        ("/api/v1/news", "GET", false),
        ("/api/v1/news/.*", "GET", true),
        ("/api/v1/news/recent", "GET", false),
        ("/api/v1/announcements/current", "GET", false),
    ];

    let exclude_patterns = public_api_paths
        .into_iter()
        .map(|(path, method, is_regex)| {
            if log::log_enabled!(log::Level::Debug) {
                debug!(
                    "Adding public API path: {} {} (regex: {})",
                    method, path, is_regex
                );
            }
            ExcludePattern {
                path: path.to_string(),
                method: Some(method.to_string()),
                is_regex,
            }
        })
        .collect();

    AuthConfig { exclude_patterns }
}

static CONFIG: Lazy<Config> = Lazy::new(Config::new);

pub fn get_config() -> &'static Config {
    &CONFIG
}

// Function to log the entire configuration (call this after initialization if needed)
pub fn log_config() {
    if log::log_enabled!(log::Level::Debug) {
        let config = get_config();
        debug!("======= CONFIGURATION =======");
        debug!("Environment: {}", config.environment);
        debug!("Database URL: {}", hide_secrets(&config.database.url));
        debug!(
            "JWT Secret: {}",
            if config.jwt.secret.len() > 10 {
                format!(
                    "{}***{}",
                    &config.jwt.secret[0..3],
                    &config.jwt.secret[config.jwt.secret.len() - 3..]
                )
            } else {
                "***".to_string()
            }
        );
        debug!("JWT Expires In: {}", config.jwt.expires_in);
        debug!(
            "Server: {}:{} (workers: {})",
            config.server.host, config.server.port, config.server.workers
        );
        debug!("Domain:");
        debug!("  Primary: {}", config.domain.primary);
        debug!("  WWW: {}", config.domain.www);
        debug!(
            "  Internal Service: {:?}",
            config.domain.internal_service_name
        );
        debug!("  Allow Local: {}", config.domain.allow_local);
        debug!("Realtime:");
        debug!("  Use WebSockets: {}", config.realtime.use_websockets);
        debug!(
            "  Session Inactive Timeout: {}",
            config.realtime.session_inactive_timeout
        );
        debug!("Chat:");
        debug!(
            "  Cleanup Interval Seconds: {}",
            config.chat.cleanup_interval_seconds
        );
        debug!("  Inactive Seconds: {}", config.chat.inactive_seconds);
        debug!(
            "Auth Exclusion Patterns: {} entries",
            config.auth.exclude_patterns.len()
        );
        debug!("============================");
    }
}

// Helper function to hide secrets in logs
fn hide_secrets(url: &str) -> String {
    if url.contains('@') {
        // For URLs with auth info like user:pass@host
        let parts: Vec<&str> = url.split('@').collect();
        if parts.len() >= 2 {
            let auth_part = parts[0];
            let host_part = parts[1];

            let proto_parts: Vec<&str> = auth_part.split("://").collect();
            let proto = if proto_parts.len() >= 2 {
                format!("{}://", proto_parts[0])
            } else {
                String::new()
            };

            return format!("{proto}***@{host_part}");
        }
    }

    // For other URLs just show protocol and host
    if url.starts_with("mongodb://") || url.starts_with("http://") || url.starts_with("https://") {
        let parts: Vec<&str> = url.split("://").collect();
        if parts.len() >= 2 {
            let proto = parts[0];
            let host_parts: Vec<&str> = parts[1].split('/').collect();
            if !host_parts.is_empty() {
                return format!("{}://{}/***", proto, host_parts[0]);
            }
        }
    }

    // Fallback for other formats
    if url.len() > 10 {
        return format!("{}***{}", &url[0..3], &url[url.len() - 3..]);
    }

    "***".to_string()
}
