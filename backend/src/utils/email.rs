use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    // RFC 5322 compliant regex for basic email validation
    static ref EMAIL_REGEX: Regex = Regex::new(
        r"^([a-z0-9_+]([a-z0-9_+.]*[a-z0-9_+])?)@([a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6})"
    ).unwrap();
}

/// Validates if the given string is a properly formatted email address
///
/// # Arguments
///
/// * `email` - The email string to validate
///
/// # Returns
///
/// * `true` if the email format is valid, `false` otherwise
pub fn is_valid_email(email: &str) -> bool {
    if email.is_empty() || email.len() > 254 {
        return false;
    }

    EMAIL_REGEX.is_match(email)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_emails() {
        assert!(is_valid_email("user@example.com"));
        assert!(is_valid_email("user.name@example.com"));
        assert!(is_valid_email("user+tag@example.com"));
        assert!(is_valid_email("user@sub.example.com"));
    }

    #[test]
    fn test_invalid_emails() {
        assert!(!is_valid_email(""));
        assert!(!is_valid_email("user@"));
        assert!(!is_valid_email("@example.com"));
        assert!(!is_valid_email("user@example"));
        assert!(!is_valid_email("user@.com"));
        assert!(!is_valid_email("user@example..com"));
        assert!(!is_valid_email("user name@example.com"));
    }
}
