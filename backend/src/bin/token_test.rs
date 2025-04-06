use chrono::Utc;
use clap::Parser;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use std::time::{Duration, UNIX_EPOCH};

// Read configuration
fn get_jwt_secret() -> String {
    // Try to read from config file first
    if let Ok(config) = std::fs::read_to_string("config/default.toml") {
        if let Some(secret_line) = config.lines().find(|line| line.contains("secret =")) {
            let parts: Vec<&str> = secret_line.split('=').collect();
            if parts.len() >= 2 {
                let secret = parts[1].trim().trim_matches('"').trim_matches('\'');
                return secret.to_string();
            }
        }
    }

    // Fallback to default
    "malenia_is_the_best_girl_in_the_world".to_string()
}

fn get_jwt_expires_in() -> String {
    // Try to read from config file first
    if let Ok(config) = std::fs::read_to_string("config/default.toml") {
        if let Some(expires_line) = config.lines().find(|line| line.contains("expires_in =")) {
            let parts: Vec<&str> = expires_line.split('=').collect();
            if parts.len() >= 2 {
                let expires = parts[1].trim().trim_matches('"').trim_matches('\'');
                return expires.to_string();
            }
        }
    }

    // Fallback to default
    "12h".to_string()
}

// Claims structure for JWT tokens
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Claims {
    pub sub: String,  // Subject (user ID)
    pub role: String, // Role: "admin" or "user"
    pub exp: usize,   // Expiration time (as UTC timestamp)
    pub iat: usize,   // Issued at (as UTC timestamp)
}

// Parse duration string to seconds
fn parse_duration_to_seconds(duration_str: &str) -> Option<i64> {
    let len = duration_str.len();
    if len < 2 {
        return None;
    }

    let (value_str, unit) = duration_str.split_at(len - 1);

    let Ok(value) = value_str.parse::<i64>() else {
        return None;
    };

    match unit {
        "s" => Some(value),         // seconds
        "m" => Some(value * 60),    // minutes to seconds
        "h" => Some(value * 3600),  // hours to seconds
        "d" => Some(value * 86400), // days to seconds
        _ => None,
    }
}

// Generate JWT token
fn generate_token(user_id: &ObjectId, role: &str) -> Result<String, String> {
    let jwt_secret = get_jwt_secret();
    let expires_in = get_jwt_expires_in();

    // Calculate expiration time based on the configured duration
    let expiration = if let Some(seconds) = parse_duration_to_seconds(&expires_in) {
        let now = Utc::now().timestamp();
        (now + seconds) as usize
    } else {
        eprintln!(
            "Warning: Invalid duration format in config: '{}'. Using default of 12h",
            expires_in
        );
        let now = Utc::now().timestamp();
        (now + 12 * 3600) as usize
    };

    let issued_at = Utc::now().timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_hex(),
        role: role.to_owned(),
        exp: expiration,
        iat: issued_at,
    };

    // Create the token
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| format!("Token generation error: {}", e))
}

// Decode token without validating expiration
fn decode_token(token: &str) -> Result<Claims, String> {
    let jwt_secret = get_jwt_secret();

    // Create validation that ignores exp field
    let mut validation = Validation::default();
    validation.validate_exp = false;

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &validation,
    )
    .map(|token_data| token_data.claims)
    .map_err(|e| format!("Token decode error: {}", e))
}

#[derive(Parser, Debug)]
#[clap(author, version, about = "Tool to create and test JWT tokens")]
struct Args {
    #[clap(subcommand)]
    action: Action,
}

#[derive(clap::Subcommand, Debug)]
enum Action {
    /// Generate a new token
    Generate {
        /// User ID for the token
        #[clap(long)]
        user_id: String,

        /// Role for the token (admin or user)
        #[clap(long, default_value = "user")]
        role: String,
    },

    /// Decode and inspect a token
    Decode {
        /// The token to decode
        #[clap(long)]
        token: String,
    },
}

fn main() {
    // Initialize logger
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let args = Args::parse();

    // Print configuration used
    println!("Configuration:");
    println!("JWT Secret: {}", get_jwt_secret());
    println!("JWT Expires In: {}", get_jwt_expires_in());

    match args.action {
        Action::Generate { user_id, role } => {
            // Parse user ID into ObjectId
            let user_obj_id = match ObjectId::parse_str(&user_id) {
                Ok(id) => id,
                Err(e) => {
                    eprintln!("Invalid user ID format: {}", e);
                    std::process::exit(1);
                }
            };

            // Generate the token
            match generate_token(&user_obj_id, &role) {
                Ok(token) => {
                    println!("\nGenerated token: {}", token);

                    // Decode token immediately to verify values
                    match decode_token(&token) {
                        Ok(claims) => {
                            let now = Utc::now().timestamp() as usize;

                            println!("\nToken information:");
                            println!("User ID: {}", claims.sub);
                            println!("Role: {}", claims.role);
                            println!(
                                "Issued at: {} ({})",
                                claims.iat,
                                format_timestamp(claims.iat as u64)
                            );
                            println!(
                                "Expires at: {} ({})",
                                claims.exp,
                                format_timestamp(claims.exp as u64)
                            );

                            // Calculate expiration duration
                            if claims.exp > now {
                                let seconds_to_expiry = claims.exp - now;
                                println!(
                                    "Expires in: {}",
                                    format_duration(seconds_to_expiry as u64)
                                );
                            } else {
                                println!("Token is already expired");
                            }
                        }
                        Err(e) => {
                            eprintln!("Failed to decode generated token: {}", e);
                            std::process::exit(1);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to generate token: {}", e);
                    std::process::exit(1);
                }
            }
        }

        Action::Decode { token } => match decode_token(&token) {
            Ok(claims) => {
                let now = Utc::now().timestamp() as usize;
                let is_valid = claims.exp > now;

                println!("\nToken information:");
                println!("User ID: {}", claims.sub);
                println!("Role: {}", claims.role);
                println!(
                    "Issued at: {} ({})",
                    claims.iat,
                    format_timestamp(claims.iat as u64)
                );
                println!(
                    "Expires at: {} ({})",
                    claims.exp,
                    format_timestamp(claims.exp as u64)
                );
                println!(
                    "Is valid: {}",
                    if is_valid { "Yes" } else { "No (expired)" }
                );

                if is_valid {
                    let seconds_to_expiry = claims.exp - now;
                    println!("Expires in: {}", format_duration(seconds_to_expiry as u64));
                }
            }
            Err(e) => {
                eprintln!("Failed to decode token: {}", e);
                std::process::exit(1);
            }
        },
    }
}

// Format Unix timestamp as human-readable date
fn format_timestamp(timestamp: u64) -> String {
    let system_time = UNIX_EPOCH + Duration::from_secs(timestamp);
    let datetime = chrono::DateTime::<chrono::Utc>::from(system_time);
    datetime.format("%Y-%m-%d %H:%M:%S UTC").to_string()
}

// Format duration in seconds as human-readable string
fn format_duration(seconds: u64) -> String {
    let days = seconds / 86400;
    let hours = (seconds % 86400) / 3600;
    let minutes = (seconds % 3600) / 60;
    let secs = seconds % 60;

    if days > 0 {
        format!("{}d {}h {}m {}s", days, hours, minutes, secs)
    } else if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, secs)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, secs)
    } else {
        format!("{}s", secs)
    }
}
