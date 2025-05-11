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
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct FriendListResponse {
    pub friends: Vec<FriendDto>,
    pub total: usize,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AddFriendDto {
    pub friend_id: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct RemoveFriendDto {
    pub friend_id: String,
}
