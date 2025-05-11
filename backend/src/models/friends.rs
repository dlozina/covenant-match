use crate::models::common::PaginationMetadata;
use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

// Friend request model for MongoDB
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FriendRequest {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub sender_id: ObjectId,
    pub receiver_id: ObjectId,
    pub status: FriendRequestStatus,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

// Status of a friend request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, ToSchema)]
pub enum FriendRequestStatus {
    Pending,
    Accepted,
    Rejected,
}

// Friendship model for MongoDB
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Friendship {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: ObjectId,
    pub friend_id: ObjectId,
    pub created_at: DateTime,
}

// DTO for creating a friend request
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateFriendRequestDto {
    pub receiver_id: String,
}

// Response DTO for friend requests
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FriendRequestResponseDto {
    pub id: String,
    pub sender_id: String,
    pub receiver_id: String,
    pub sender_username: Option<String>,
    pub receiver_username: Option<String>,
    pub sender_avatar: Option<String>,
    pub receiver_avatar: Option<String>,
    pub status: FriendRequestStatus,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

// Response with a list of friend requests
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FriendRequestsResponse {
    pub incoming: Vec<FriendRequestResponseDto>,
    pub outgoing: Vec<FriendRequestResponseDto>,
}

// Response for a single friend request operation
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FriendRequestResponse {
    pub status: String,
    pub message: String,
    pub request: Option<FriendRequestResponseDto>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct FriendDto {
    pub id: String,
    pub username: String,
    pub avatar_url: Option<String>,
    pub covenant_name: String,
    pub platform: String,
    pub region: String,
}

/// Response for friend list
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct FriendListResponse {
    pub friends: Vec<FriendDto>,
    pub total: usize,
}

/// Response for paginated friend list
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PaginatedFriendsResponse {
    pub friends: Vec<FriendDto>,
    pub metadata: PaginationMetadata,
}

/// Response for paginated friend requests
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PaginatedFriendRequestsResponse {
    pub requests: Vec<FriendRequestResponseDto>,
    pub metadata: PaginationMetadata,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AddFriendDto {
    pub friend_id: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct RemoveFriendDto {
    pub friend_id: String,
}

// Response for the has-pending-requests endpoint
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct HasPendingFriendRequestsResponse {
    pub has_pending_requests: bool,
}
