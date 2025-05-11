use crate::models::admin::{
    ActorMailboxResponse, AdminChatResponse, AdminDashboardStats, AdminSessionResponse,
    AdminSessionsData, AdminSessionsPaginationResponse, AdminSessionsResponse,
    ConnectionStatsResponse, ConnectionsPerHourResponse, CreateFeatureFlagDto,
    DashboardStatsResponse, FeatureFlag, FeatureFlagApiResponse, FeatureFlagResponse,
    FeatureFlagsData, FeatureFlagsResponse, LoginAttemptDTO, LoginAttemptsData,
    LoginAttemptsResponse, MemoryUsage, PatchFeatureFlagDto, SessionConnectionResponse, SystemInfo,
    SystemStatusResponse, WebSocketStatsData, WebSocketStatsResponse,
};
use crate::models::bug::{
    BugReport, BugReportData, BugReportResponse, BugReportResponseDto, BugReportsData,
    BugReportsListResponse, CreateBugReportData, CreateBugReportDto, CreateBugReportResponse,
};
use crate::models::chat::ChatMessageResponseDto;
use crate::models::common::{LimitQuery, PaginationQuery};
use crate::models::friends::{
    AddFriendDto, CreateFriendRequestDto, FriendDto, FriendListResponse, FriendRequestResponse, FriendRequestResponseDto, FriendRequestStatus, FriendRequestsResponse, HasPendingFriendRequestsResponse, PaginatedFriendRequestsResponse, PaginatedFriendsResponse, RemoveFriendDto
};
use crate::models::game_data::{
    Covenant, CovenantResponse, Experience, ExperienceResponse, GameDataResponse, NightLord,
    NightLordResponse, Nightfarer, NightfarerResponse, Platform, PlatformResponse, Region,
    RegionResponse,
};
use crate::models::geo_location::{CoordinatesDto, GeoLocationDataDto};
use crate::models::news::{
    Announcement, AnnouncementResponse, CreateNewsDto, NewsListData, NewsListResponse,
    NewsResponse, UpdateAnnouncementDto, UpdateNewsDto,
};
use crate::models::session::{
    CovenantStats, CovenantStatsResponse, CreateSessionDto, FriendshipMatrix, FriendshipPlayer,
    GameResult, GameSessionDto, JoinSessionDto, MinimalSessionDto, PaginatedSessionsResponse,
    PaginationMetadata, PlayerInfo, PlayerInfoResponseDto, RateSessionDto, ResultsResponseDto,
    SessionResponseDto, SessionResult, SessionResultResponseDto, SessionStatus, SubmitResultDto,
    UpdateSessionDto, UserSessionResponseDto,
};
use crate::models::statistics::{
    BatchUserStatsResponse, LeaderboardEntryResponseDto, NightLordStatsResponse,
    PaginatedSessionData, PaginatedSessionResponse, SessionHistoryResponse, Stats, UserStatistics,
    UserStatsResponse,
};
use crate::models::user::{
    AuthResponse, CreateUserDto, GetUsersQuery, LoginUserDto, PaginationInfo, RefreshTokenResponse,
    UpdateUserDto, UpdateUserProfileDto, User, UserResponse, UsersListData, UsersListResponse,
};
use crate::models::user_data::UserDataResponseDto;
use crate::routes::users::{JwtInfoDto, TokenInfoResponse};
use crate::sse::messages::{ServerMessage, SessionInfo, SseSessionStatus};

use crate::routes::{
    admin::*, bug::*, chat::*, friends::*, game_data::*, health::*, news::*, sessions::*, sse::*,
    statistics::*, user_data::*, users::*, ws::*,
};

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
        verify_email,
        reset_password_email,
        reset_password,
        get_user_sessions,
        // Friend routes        
        send_friend_request,
        get_friend_requests,
        get_incoming_friend_requests,
        get_outgoing_friend_requests,
        accept_friend_request,
        reject_friend_request,
        get_friends,
        remove_friend,
        has_pending_friend_requests,
        // Admin routes
        get_all_users,
        get_user_by_id_admin,
        update_user_admin,
        delete_user_admin,
        get_admin_news,
        get_admin_news_by_id,
        get_dashboard_stats,
        get_system_info,
        get_admin_sessions,
        get_admin_session_by_id,
        delete_admin_session,
        get_admin_chat_history,
        delete_admin_chat_messages,
        get_login_attempts,
        // Feature Flag endpoints
        get_feature_flags,
        get_feature_flag,
        create_feature_flag,
        update_feature_flag,
        delete_feature_flag,
        get_feature_flag_value,
        // User data routes
        get_current_user_data,
        test_cloudflare_headers,
        // Session routes
        get_sessions,
        create_session,
        get_session,
        join_session,
        start_session,
        cancel_session,
        leave_session,
        complete_session,
        recreate_session,
        update_session,
        submit_result,
        get_results,
        get_public_sessions,
        get_user_active_session,
        get_friends_sessions,
        reset_session_flags,
        kick_player,
        get_friendship_matrix,
        // Game data routes
        get_game_data,
        get_platforms,
        get_regions,
        get_covenants,
        get_nightfarers,
        get_night_lords,
        // Chat routes removed since we moved it to admin
        // SSE routes
        events_route,
        events_status,
        // WebSocket routes
        ws_session_route,
        ws_status,
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
        get_multiple_users_statistics,
        // News routes
        get_all_news,
        get_news_by_id,
        create_news,
        update_news,
        delete_news,
        get_recent_news,
        // Announcement routes
        get_current_announcement,
        update_announcement,
        // Chat routes
        get_chat_history,
        // Bug routes
        create_bug_report,
        get_all_bug_reports,
        get_bug_report_by_id,
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
            UserSessionResponseDto,
            GameSessionDto,
            // Friend models
            AddFriendDto,
            RemoveFriendDto,
            FriendDto,
            FriendListResponse,
            PaginatedFriendsResponse,
            // Friend request models
            CreateFriendRequestDto,
            FriendRequestResponseDto,
            FriendRequestResponse,
            FriendRequestsResponse,
            PaginatedFriendRequestsResponse,
            FriendRequestStatus,
            HasPendingFriendRequestsResponse,
            // User data models
            UserDataResponseDto,
            GeoLocationDataDto,
            CoordinatesDto,
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
            PlayerInfoResponseDto,
            SessionResultResponseDto,
            FriendshipMatrix,
            FriendshipPlayer,
            PaginationMetadata,
            PaginatedSessionsResponse<SessionResponseDto>,
            // Covenant statistics models
            CovenantStats,
            CovenantStatsResponse,
            // Game data models
            Platform,
            Region,
            Covenant,
            Nightfarer,
            NightLord,
            Experience,
            GameDataResponse,
            PlatformResponse,
            RegionResponse,
            CovenantResponse,
            NightfarerResponse,
            NightLordResponse,
            ExperienceResponse,
            // Chat models
            ChatMessageResponseDto,
            // SSE models
            ServerMessage,
            SessionInfo,
            SseSessionStatus,
            // Statistics models
            Stats,
            UserStatistics,
            LeaderboardEntryResponseDto,
            NightLordStatsResponse,
            SessionHistoryResponse,
            PaginatedSessionResponse,
            PaginatedSessionData,
            SessionDetailResponse,
            SessionDetail,
            PlayerDetail,
            SessionsStatsResponse,
            SessionsStatsData,
            BatchUserStatsResponse,
            UserStatsResponse,
            // News models
            NewsResponse,
            NewsListResponse,
            CreateNewsDto,
            UpdateNewsDto,
            NewsListData,
            // Announcement models
            Announcement,
            UpdateAnnouncementDto,
            AnnouncementResponse,
            // Bug models
            BugReport,
            CreateBugReportDto,
            BugReportResponseDto,
            BugReportResponse,
            BugReportData,
            BugReportsListResponse,
            BugReportsData,
            CreateBugReportResponse,
            CreateBugReportData,
            // Admin models
            AdminDashboardStats,
            SystemInfo,
            MemoryUsage,
            SystemStatusResponse,
            DashboardStatsResponse,
            AdminSessionResponse,
            AdminSessionsResponse,
            AdminSessionsPaginationResponse,
            AdminSessionsData,
            AdminChatResponse,
            LoginAttemptsResponse,
            LoginAttemptsData,
            LoginAttemptDTO,
            // WebSocket Stats models
            WebSocketStatsResponse,
            WebSocketStatsData,
            ConnectionStatsResponse,
            ConnectionsPerHourResponse,
            SessionConnectionResponse,
            ActorMailboxResponse,
            // Feature Flag models
            FeatureFlag,
            FeatureFlagApiResponse,
            FeatureFlagResponse,
            FeatureFlagsResponse,
            FeatureFlagsData,
            CreateFeatureFlagDto,
            PatchFeatureFlagDto,
            // Common models
            PaginationQuery,
            LimitQuery,
        ),
    ),
    tags(
        (name = "health", description = "Health check endpoints"),
        (name = "users", description = "User management endpoints"),
        (name = "admin", description = "Admin-only endpoints"),
        (name = "users-data", description = "User data endpoints with geolocation information"),
        (name = "sessions", description = "Session management endpoints"),
        (name = "game-data", description = "Game data endpoints"),
        (name = "statistics", description = "Statistics endpoints"),
        (name = "chat", description = "Chat messaging endpoints"),
        (name = "realtime", description = "Real-time communication endpoints"),
        (name = "news", description = "News and announcements management endpoints"),
        (name = "feature-flags", description = "Feature flag management endpoints"),
        (name = "friends", description = "Friend management and friend requests endpoints"),
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
