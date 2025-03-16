use crate::models::session::{
    CreateSessionDto, GameResult, JoinSessionDto, PlayerInfo, RateSessionDto, ResultsResponseDto,
    SessionResponseDto, SessionResult, SessionStatus, SubmitResultDto,
};
use crate::models::user::{
    AuthResponse, CreateUserDto, GetUsersQuery, LoginUserDto, PaginationInfo, UpdateUserDto,
    UpdateUserProfileDto, User, UserResponse, UsersListData, UsersListResponse,
};
use crate::routes::{
    health::*,
    // Import other routes as they become available
    sessions::*,
    // statistics::*,
    users::*,
};

use utoipa::{
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
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
        submit_result,
        get_results,
        rate_session,
        // Add statistics routes as they become available
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
            UpdateUserProfileDto,
            GetUsersQuery,
            UsersListResponse,
            UsersListData,
            PaginationInfo,
            // Session models
            CreateSessionDto,
            JoinSessionDto,
            RateSessionDto,
            SubmitResultDto,
            SessionResponseDto,
            ResultsResponseDto,
            // Add the missing schema components
            PlayerInfo,
            SessionStatus,
            GameResult,
            SessionResult,
            // Add other models as needed
        ),
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management endpoints"),
        (name = "admin", description = "Admin-only endpoints"),
        (name = "sessions", description = "Session management endpoints"),
        (name = "statistics", description = "Statistics endpoints")
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

            // Apply security to all endpoints except login and user creation
            for (path, path_item) in openapi.paths.paths.iter_mut() {
                for (method, operation) in &mut path_item.operations {
                    // Check the path and method for exceptions
                    let method_str = match method {
                        utoipa::openapi::PathItemType::Post => "post",
                        _ => "other",
                    };

                    // Skip auth for login and user creation endpoints
                    if !(path.contains("/auth/login")
                        || (path.contains("/users") && method_str == "post"))
                    {
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
