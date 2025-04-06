use crate::models::game_data::{
    Covenant, CovenantResponse, GameDataResponse, NightLord, NightLordResponse, Nightfarer,
    NightfarerResponse, Platform, PlatformResponse, Region, RegionResponse,
};
use crate::models::session::{
    CovenantStats, CovenantStatsResponse, CreateSessionDto, GameResult, JoinSessionDto,
    MinimalSessionDto, PlayerInfo, RateSessionDto, ResultsResponseDto, SessionResponseDto,
    SessionResult, SessionStatus, SubmitResultDto, UpdateSessionDto,
};
use crate::models::statistics::{LeaderboardEntry, Stats, UserStatistics};
use crate::models::user::{
    AuthResponse, CreateUserDto, GetUsersQuery, LoginUserDto, PaginationInfo, RefreshTokenResponse,
    UpdateUserDto, UpdateUserProfileDto, User, UserResponse, UsersListData, UsersListResponse,
};
use crate::routes::statistics::NightLordStatsResponse;
use crate::routes::users::{JwtInfoDto, TokenInfoResponse};
use crate::sse::messages::{ServerMessage, SessionInfo, SseSessionStatus};

use crate::routes::{game_data::*, health::*, sessions::*, sse::*, statistics::*, users::*};

// Import SSE models
use crate::config::get_config;
use actix_web::http::Method;
use regex::Regex;

use utoipa::{
    openapi::security::SecurityScheme,
    openapi::{OpenApiBuilder, Server},
    Modify, OpenApi,
};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Covenant Matchmaking API",
        description = "API documentation for the Covenant Matchmaking Service",
        version = "1.0.0"
    ),
    paths(
        // Health routes
        health_check_v1,
        health_check_v2,
        // User routes
        create_user,
        login,
        refresh_token,
        decode_token,
        get_current_user,
        create_admin_user,
        update_profile,
        delete_user,
        // Admin routes
        get_all_users,
        get_user_by_id_admin,
        update_user_admin,
        delete_user_admin,
        // Session routes
        get_sessions,
        create_session,
        get_session,
        join_session,
        start_session,
        cancel_session,
        complete_session,
        recreate_session,
        update_session,
        submit_result,
        get_results,
        get_public_sessions,
        get_user_active_session,
        // Game data routes
        get_game_data,
        get_platforms,
        get_regions,
        get_covenants,
        get_nightfarers,
        get_night_lords,
        // SSE routes
        events_route,
        events_status,
        // Statistics routes
        get_current_user_statistics,
        get_user_statistics,
        get_leaderboard,
        get_night_lord_statistics,
        get_all_night_lord_statistics,
        get_current_user_session_history,
        get_session_details,
        get_sessions_stats,
        get_covenant_stats,
    ),
    components(
        schemas(
            // User models
            User,
            CreateUserDto,
            UserResponse,
            LoginUserDto,
            UpdateUserDto,
            AuthResponse,
            RefreshTokenResponse,
            UpdateUserProfileDto,
            GetUsersQuery,
            UsersListResponse,
            UsersListData,
            PaginationInfo,
            JwtInfoDto,
            TokenInfoResponse,
            // Session models
            CreateSessionDto,
            JoinSessionDto,
            RateSessionDto,
            SubmitResultDto,
            UpdateSessionDto,
            SessionResponseDto,
            ResultsResponseDto,
            MinimalSessionDto,
            PlayerInfo,
            SessionStatus,
            GameResult,
            SessionResult,
            // Covenant statistics models
            CovenantStats,
            CovenantStatsResponse,
            // Game data models
            Platform,
            Region,
            Covenant,
            Nightfarer,
            NightLord,
            GameDataResponse,
            PlatformResponse,
            RegionResponse,
            CovenantResponse,
            NightfarerResponse,
            NightLordResponse,
            // SSE models
            ServerMessage,
            SessionInfo,
            SseSessionStatus,
            // Statistics models
            Stats,
            UserStatistics,
            LeaderboardEntry,
            NightLordStatsResponse,
            SessionHistoryResponse,
            PaginatedSessionResponse,
            PaginatedSessionData,
            SessionDetailResponse,
            SessionDetail,
            PlayerDetail,
            SessionsStatsResponse,
            SessionsStatsData,
        ),
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management endpoints"),
        (name = "admin", description = "Admin-only endpoints"),
        (name = "sessions", description = "Session management endpoints"),
        (name = "game-data", description = "Game data endpoints"),
        (name = "statistics", description = "Statistics endpoints"),
        (name = "realtime", description = "Real-time communication endpoints")
    ),
    modifiers(&SecurityAddon),
)]
struct ApiDoc;

// Security addon to add JWT Bearer auth
struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            // Create the HTTP auth scheme with proper description and bearer format
            let mut http = utoipa::openapi::security::Http::new(
                utoipa::openapi::security::HttpAuthScheme::Bearer,
            );

            // Set description and bearer format directly on the Http struct
            http.description = Some("Enter JWT token".to_string());
            http.bearer_format = Some("JWT".to_string());

            // Add the security scheme to components
            components.add_security_scheme("bearer_auth", SecurityScheme::Http(http));

            // Get config exclude patterns
            let app_config = get_config();
            let exclude_patterns = &app_config.auth.exclude_patterns;

            // Apply security to all endpoints except those in exclude patterns
            for (path, path_item) in openapi.paths.paths.iter_mut() {
                for (method, operation) in &mut path_item.operations {
                    // Convert to HTTP method for comparison
                    let http_method = match method {
                        utoipa::openapi::PathItemType::Get => Method::GET,
                        utoipa::openapi::PathItemType::Post => Method::POST,
                        utoipa::openapi::PathItemType::Put => Method::PUT,
                        utoipa::openapi::PathItemType::Delete => Method::DELETE,
                        utoipa::openapi::PathItemType::Patch => Method::PATCH,
                        utoipa::openapi::PathItemType::Options => Method::OPTIONS,
                        utoipa::openapi::PathItemType::Head => Method::HEAD,
                        _ => Method::GET,
                    };

                    // Check if this path should be excluded from auth
                    let should_exclude = exclude_patterns.iter().any(|pattern| {
                        // Check method
                        let method_matches = match pattern.get_method() {
                            Some(pattern_method) => http_method == pattern_method,
                            None => true, // If no method specified, match any method
                        };

                        if !method_matches {
                            return false;
                        }

                        // Check path
                        let api_path = path.as_str();

                        if pattern.is_regex {
                            // Use regex matching for patterns marked as regex
                            match Regex::new(&pattern.path) {
                                Ok(regex) => regex.is_match(api_path),
                                Err(_) => false,
                            }
                        } else {
                            // Use simple path matching
                            api_path.starts_with(&pattern.path)
                        }
                    });

                    // If not excluded, apply security requirement
                    if !should_exclude {
                        // Create a security requirement with bearer_auth and empty scopes
                        let security_req = utoipa::openapi::SecurityRequirement::new(
                            "bearer_auth",
                            Vec::<String>::new(),
                        );

                        // Assign the security requirement
                        operation.security = Some(vec![security_req]);
                    }
                }
            }
        }
    }
}

pub fn get_openapi() -> utoipa::openapi::OpenApi {
    let mut openapi = ApiDoc::openapi();

    // Add server information
    let server_url =
        std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());
    openapi.servers = Some(vec![Server::new(server_url)]);

    // Clean up descriptions (optional)
    openapi
        .paths
        .paths
        .iter_mut()
        .flat_map(|(_, path)| &mut path.operations)
        .for_each(|(_, operation)| {
            if let Some(raw_description) = operation.description.as_ref() {
                let (summary, desc) = raw_description
                    .split_once("\n\n")
                    .unwrap_or((raw_description, ""));
                operation.summary = Some(summary.into());
                operation.description = if desc.is_empty() {
                    None
                } else {
                    Some(desc.to_string())
                };
            }
        });

    openapi.merge(OpenApiBuilder::new().build());
    openapi
}
