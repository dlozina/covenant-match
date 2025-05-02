use std::fs;

pub fn read_secret(secret_name: &str, default_value: &str) -> String {
    let path = format!("/run/secrets/{secret_name}");
    if let Ok(content) = fs::read_to_string(&path) {
        content.trim().to_string()
    } else {
        log::warn!("Warning: Could not read secret from {}", path);
        default_value.to_string()
    }
}
