use crate::utils::jwt::Claims;
use actix_web::{HttpMessage, HttpRequest};

use super::jwt;

/// Get the claims from the request
/// Not a big fan of how actix handles scopes, so we'll just get the claims manually
pub fn get_claims(req: &HttpRequest) -> Option<Claims> {
    let extensions = req.extensions();
    let claims = extensions.get::<jwt::Claims>();
    claims.cloned()
}

/// Check if the user is an admin
pub fn is_admin(req: &HttpRequest) -> bool {
    if let Some(claims) = get_claims(req) {
        claims.role == "admin"
    } else {
        false
    }
}
