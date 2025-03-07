use once_cell::sync::Lazy;

pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expires_in: String,
}

impl Config {
    fn new() -> Self {
        let database_url = std::env::var("MONGODB_URI")
            .unwrap_or_else(|_| "mongodb://localhost:27017/covenant-match".to_string());
            
        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "your_jwt_secret_key".to_string());
            
        let jwt_expires_in = std::env::var("JWT_EXPIRES_IN")
            .unwrap_or_else(|_| "60m".to_string());
        
        Self {
            database_url,
            jwt_secret,
            jwt_expires_in,
        }
    }
}

static CONFIG: Lazy<Config> = Lazy::new(|| Config::new());

pub fn get_config() -> &'static Config {
    &CONFIG
}
