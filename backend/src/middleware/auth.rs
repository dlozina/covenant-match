// in auth.rs
use crate::config::get_config;
use crate::models::error::AppError;
use crate::utils::jwt;
use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    http::Method,
    Error, HttpMessage,
};
use futures::future::{ready, Ready};
use regex::Regex;
use std::future::Future;
use std::pin::Pin;

// Authentication middleware with optional role requirement
pub struct Auth {
    require_role: Option<String>,
}

impl Auth {
    // Just verify the user is authenticated without role check
    pub fn user() -> Self {
        Auth { require_role: None }
    }
}

impl<S, B> Transform<S, ServiceRequest> for Auth
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = AuthMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(AuthMiddleware {
            service,
            require_role: self.require_role.clone(),
        }))
    }
}

pub struct AuthMiddleware<S> {
    service: S,
    require_role: Option<String>,
}

// Helper function to check if a path should be excluded from authentication
fn is_path_excluded(path: &str, method: &Method) -> bool {
    // Skip auth check for OPTIONS requests (for CORS preflight)
    if method == Method::OPTIONS {
        return true;
    }

    // Get exclude patterns from config
    let config = get_config();

    // Check against defined exclusion patterns from config
    config.auth.exclude_patterns.iter().any(|pattern| {
        let method_matches = match pattern.get_method() {
            Some(excluded) => method == excluded,
            None => true, // If no method specified in config, match any method
        };

        if !method_matches {
            return false;
        }

        if pattern.is_regex {
            // Use regex matching for patterns marked as regex
            if let Ok(regex) = Regex::new(&pattern.path) {
                regex.is_match(path)
            } else {
                log::error!("Invalid regex pattern: {}", pattern.path);
                false
            }
        } else {
            // Use simple path matching
            path.starts_with(&pattern.path)
        }
    })
}

impl<S, B> Service<ServiceRequest> for AuthMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, req: ServiceRequest) -> Self::Future {
        let path = req.path().to_string();
        let method = req.method().clone();

        log::info!("Auth middleware called for path: {}", path);

        // Check if the path is excluded from authentication
        if is_path_excluded(&path, &method) {
            log::info!("Path excluded from authentication: {}", path);
            let fut = self.service.call(req);
            return Box::pin(fut);
        }

        let require_role = self.require_role.clone();
        // Extract token from headers
        let auth_header = req.headers().get("Authorization");
        log::info!("Auth header: {:?}", auth_header);
        let auth_result = match auth_header {
            Some(header) => {
                let auth_str = header.to_str().unwrap_or("");
                if auth_str.starts_with("Bearer ") {
                    let token = auth_str.trim_start_matches("Bearer ");

                    // Validate token and extract claims
                    match jwt::validate_token(token) {
                        Ok(claims) => {
                            // Check role if required
                            log::info!(
                                "Token validated successfully for user: {}, role: {}",
                                claims.sub,
                                claims.role
                            );
                            if let Some(required_role) = &require_role {
                                if &claims.role != required_role
                                    && !(required_role == "user" && claims.role == "admin")
                                {
                                    Err(AppError::InsufficientPermissions)
                                } else {
                                    // Store claims in request extensions
                                    req.extensions_mut().insert(claims);
                                    Ok(())
                                }
                            } else {
                                // Just authenticate without role check
                                req.extensions_mut().insert(claims);
                                Ok(())
                            }
                        }
                        Err(e) => {
                            log::error!("Token validation error: {}", e);
                            Err(e)
                        }
                    }
                } else {
                    Err(AppError::InvalidToken)
                }
            }
            None => Err(AppError::AuthenticationRequired),
        };

        let fut = self.service.call(req);

        Box::pin(async move {
            match auth_result {
                Ok(()) => fut.await,
                Err(e) => {
                    // Convert AppError to actix_web::Error
                    let error_response = match e {
                        AppError::TokenExpired => {
                            actix_web::HttpResponse::Unauthorized().json(serde_json::json!({
                                "status": "error",
                                "message": "Token expired"
                            }))
                        }
                        AppError::InvalidToken => {
                            actix_web::HttpResponse::Unauthorized().json(serde_json::json!({
                                "status": "error",
                                "message": "Invalid token"
                            }))
                        }
                        AppError::AuthenticationRequired => actix_web::HttpResponse::Unauthorized()
                            .json(serde_json::json!({
                                "status": "error",
                                "message": "Authentication required"
                            })),
                        AppError::InsufficientPermissions => actix_web::HttpResponse::Forbidden()
                            .json(serde_json::json!({
                                "status": "error",
                                "message": "Insufficient permissions"
                            })),
                        _ => {
                            actix_web::HttpResponse::InternalServerError().json(serde_json::json!({
                                "status": "error",
                                "message": "Internal server error"
                            }))
                        }
                    };
                    Err(actix_web::error::InternalError::from_response("", error_response).into())
                }
            }
        })
    }
}
