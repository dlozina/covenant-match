use std::collections::HashMap;

use actix_web::{get, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use mongodb::Database;

use crate::{
    models::{geo_location::GeoLocationDataDto, user_data::UserDataResponseDto},
    services::user_service,
    utils::{geo_location, ip_address, jwt},
};

/// Get current user profile with geolocation data
#[utoipa::path(
    get,
    path = "/api/v1/users-data/me",
    responses(
        (status = 200, description = "User profile retrieved successfully", body = UserDataResponseDto),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "users-data"
)]
#[get("/api/v1/users-data/me")]
async fn get_current_user_data(db: web::Data<Database>, req: HttpRequest) -> impl Responder {
    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Get the client ip address
    let ip_address = ip_address::get_client_ip(&req);

    // Get the client region
    let client_region = geo_location::get_client_region(&req);
    let geo_location_data = GeoLocationDataDto::from(client_region);

    // Get the user from the database
    match user_service::get_user_by_id(&db, &user_id).await {
        Ok(user) => {
            // Create the response
            let user_data_response = UserDataResponseDto {
                ip_address,
                geo_location_data,
                email: Some(user.email),
                password: None,
                display_name: user.display_name,
                region: Some(user.region),
                auto_region: Some(user.auto_region),
                platform: Some(user.platform),
                covenant_name: Some(user.covenant_name),
                avatar_url: user.avatar_url,
                preferred_session_name: user.preferred_session_name,
                preferred_session_password: user.preferred_session_password,
                preferred_nightfarer: user.preferred_nightfarer,
            };

            HttpResponse::Ok().json(user_data_response)
        }
        Err(e) => {
            log::error!("Error retrieving user data: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": format!("Error retrieving user data: {}", e)
            }))
        }
    }
}

/// Test endpoint to display all Cloudflare geolocation headers
#[utoipa::path(
    get,
    path = "/api/v1/users-data/cf-headers",
    responses(
        (status = 200, description = "Cloudflare headers retrieved successfully", body = HashMap<String, String>),
        (status = 500, description = "Internal server error")
    ),
    tag = "users-data"
)]
#[get("/api/v1/users-data/cf-headers")]
async fn test_cloudflare_headers(req: HttpRequest) -> impl Responder {
    let mut headers = HashMap::new();

    // Standard header for IP address
    headers.insert("ip_address".to_string(), ip_address::get_client_ip(&req));

    // Cloudflare geolocation headers
    let cf_headers = [
        "cf-ipcountry",
        "cf-ipcity",
        "cf-ipcontinent",
        "cf-iplatitude",
        "cf-iplongitude",
        "cf-region",
        "cf-region-code",
        "cf-metro-code",
        "cf-postal-code",
        "cf-timezone",
    ];

    for header in &cf_headers {
        if let Some(value) = req.headers().get(*header).and_then(|v| v.to_str().ok()) {
            headers.insert((*header).to_string(), value.to_string());
        }
    }

    HttpResponse::Ok().json(headers)
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(get_current_user_data)
        .service(test_cloudflare_headers);
}
