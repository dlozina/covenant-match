use std::fs;

pub fn read_secret(secret_name: &str, default_value: &str) -> String {
    let path = format!("/run/secrets/{secret_name}");
    if let Ok(content) = fs::read_to_string(&path) {
        content.trim().to_string()
    } else {
        log::warn!(
            "Warning: Could not read secret from {} at {}",
            secret_name,
            path
        );
        default_value.to_string()
    }
}

pub fn read_secret_without_default(secret_name: &str) -> String {
    let path = format!("/run/secrets/{secret_name}");
    if let Ok(content) = fs::read_to_string(&path) {
        content.trim().to_string()
    } else {
        log::warn!(
            "Warning: Could not read secret from {} at {}",
            secret_name,
            path
        );
        String::new()
    }
}
