use crate::models::error::AppError;
use crate::utils::jwt;
use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage,
};
use futures::future::{ok, ready, Ready};
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

// Authentication middleware
pub struct Authentication;

impl Authentication {
    pub fn new() -> Self {
        Authentication
    }
}

// Middleware factory for Authentication
impl<S, B> Transform<S, ServiceRequest> for Authentication
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = AuthenticationMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ok(AuthenticationMiddleware { service })
    }
}

pub struct AuthenticationMiddleware<S> {
    service: S,
}

impl<S, B> Service<ServiceRequest> for AuthenticationMiddleware<S>
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
        // Extract the token from headers
        let auth_header = req.headers().get("Authorization");
        let auth_result = match auth_header {
            Some(header) => {
                let auth_str = header.to_str().unwrap_or("");
                if auth_str.starts_with("Bearer ") {
                    let token = auth_str.trim_start_matches("Bearer ");
                    // Validate token and extract user_id
                    match jwt::validate_token(token) {
                        Ok(claims) => {
                            // Store claims in request extensions
                            req.extensions_mut().insert(claims);
                            Ok(())
                        }
                        Err(e) => Err(e),
                    }
                } else {
                    Err(AppError::InvalidToken)
                }
            }
            None => Err(AppError::AuthenticationRequired),
        };

        // If token is valid, call the next middleware
        let fut = self.service.call(req);

        Box::pin(async move {
            match auth_result {
                Ok(_) => fut.await,
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

// Simplified RequireRole middleware
pub struct RequireRole(pub String);

impl RequireRole {
    pub fn admin() -> Self {
        RequireRole("admin".to_string())
    }

    pub fn user() -> Self {
        RequireRole("user".to_string())
    }
}

impl<S, B> Transform<S, ServiceRequest> for RequireRole
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = RequireRoleMiddleware<S>;
    type InitError = ();
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(RequireRoleMiddleware {
            service,
            role: self.0.clone(),
        }))
    }
}

pub struct RequireRoleMiddleware<S> {
    service: S,
    role: String,
}

impl<S, B> Service<ServiceRequest> for RequireRoleMiddleware<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>>>>;

    forward_ready!(service);

    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        let role = self.role.clone();
        
        // Check for JWT in the Authorization header
        let auth_header = req.headers().get("Authorization");
        let auth_result = match auth_header {
            Some(header) => {
                let auth_str = header.to_str().unwrap_or("");
                if auth_str.starts_with("Bearer ") {
                    let token = auth_str.trim_start_matches("Bearer ");
                    // Validate token and extract claims
                    match jwt::validate_token(token) {
                        Ok(claims) => {
                            // Store claims in request extensions
                            req.extensions_mut().insert(claims.clone());
                            
                            // Check role
                            if claims.role == role || (role == "user" && claims.role == "admin") {
                                Ok(())
                            } else {
                                Err(actix_web::error::ErrorForbidden("Insufficient permissions"))
                            }
                        }
                        Err(e) => Err(actix_web::error::ErrorUnauthorized(format!("Invalid token: {}", e))),
                    }
                } else {
                    Err(actix_web::error::ErrorUnauthorized("Invalid authorization header format"))
                }
            }
            None => Err(actix_web::error::ErrorUnauthorized("Authentication required")),
        };

        let fut = self.service.call(req);
        
        Box::pin(async move {
            match auth_result {
                Ok(_) => fut.await,
                Err(e) => Err(e),
            }
        })
    }
}