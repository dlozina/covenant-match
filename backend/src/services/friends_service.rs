use crate::models::common::PaginationMetadata;
use crate::models::error::AppError;
use crate::models::friends::{
    FriendDto, FriendListResponse, FriendRequest, FriendRequestResponse, FriendRequestResponseDto, FriendRequestStatus, FriendRequestsResponse, HasPendingFriendRequestsResponse, PaginatedFriendRequestsResponse, PaginatedFriendsResponse
};
use crate::models::user::User;
use crate::repository::{friends_repository, user_repository};
use futures::StreamExt;
use futures_util::TryStreamExt;
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::{Collection, Database};

pub async fn send_friend_request(
    db: &Database,
    sender_id: &str,
    receiver_id: &str,
) -> Result<FriendRequestResponse, AppError> {
    // Check that sender is not trying to friend themselves
    if sender_id == receiver_id {
        return Err(AppError::InvalidFriendRequest(
            "Cannot send a friend request to yourself".to_string(),
        ));
    }

    let request = friends_repository::create_friend_request(db, sender_id, receiver_id).await?;

    // Get user info to include in the response
    let users_coll: Collection<User> = db.collection("users");
    let sender = users_coll
        .find_one(doc! { "_id": &request.sender_id })
        .await?;
    let receiver = users_coll
        .find_one(doc! { "_id": &request.receiver_id })
        .await?;

    // Store the status value before moving request
    let status = request.status.clone();

    let response_dto = FriendRequestResponseDto {
        id: request.id.to_hex(),
        sender_id: request.sender_id.to_hex(),
        receiver_id: request.receiver_id.to_hex(),
        sender_username: sender.as_ref().map(|u| u.username.clone()),
        receiver_username: receiver.as_ref().map(|u| u.username.clone()),
        sender_avatar: sender.as_ref().and_then(|u| u.avatar_url.clone()),
        receiver_avatar: receiver.as_ref().and_then(|u| u.avatar_url.clone()),
        status: request.status,
        created_at: request.created_at,
        updated_at: request.updated_at,
    };

    let message = match status {
        FriendRequestStatus::Pending => "Friend request sent successfully",
        FriendRequestStatus::Accepted => "Friend request automatically accepted",
        _ => "Friend request processed",
    };

    Ok(FriendRequestResponse {
        status: "success".to_string(),
        message: message.to_string(),
        request: Some(response_dto),
    })
}

pub async fn get_friend_requests(
    db: &Database,
    user_id: &str,
) -> Result<FriendRequestsResponse, AppError> {
    let (incoming, outgoing) = friends_repository::get_friend_requests(db, user_id).await?;

    // Get all user IDs involved in the requests
    let mut user_ids = Vec::new();
    for req in &incoming {
        user_ids.push(req.sender_id);
    }
    for req in &outgoing {
        user_ids.push(req.receiver_id);
    }

    // Deduplicate user IDs
    user_ids.sort();
    user_ids.dedup();

    // Fetch all users in a single query
    let users_coll: Collection<User> = db.collection("users");
    let cursor = users_coll
        .find(doc! {
            "_id": { "$in": &user_ids }
        })
        .await?;

    let users: Vec<User> = cursor
        .collect::<Vec<Result<User, _>>>()
        .await
        .into_iter()
        .filter_map(Result::ok)
        .collect();

    let user_map: std::collections::HashMap<ObjectId, User> =
        users.into_iter().map(|user| (user.id, user)).collect();

    // Convert incoming requests to DTOs
    let incoming_dtos = incoming
        .into_iter()
        .map(|req| {
            let sender = user_map.get(&req.sender_id);
            let receiver = user_map.get(&req.receiver_id);

            FriendRequestResponseDto {
                id: req.id.to_hex(),
                sender_id: req.sender_id.to_hex(),
                receiver_id: req.receiver_id.to_hex(),
                sender_username: sender.map(|u| u.username.clone()),
                receiver_username: receiver.map(|u| u.username.clone()),
                sender_avatar: sender.and_then(|u| u.avatar_url.clone()),
                receiver_avatar: receiver.and_then(|u| u.avatar_url.clone()),
                status: req.status,
                created_at: req.created_at,
                updated_at: req.updated_at,
            }
        })
        .collect();

    // Convert outgoing requests to DTOs
    let outgoing_dtos = outgoing
        .into_iter()
        .map(|req| {
            let sender = user_map.get(&req.sender_id);
            let receiver = user_map.get(&req.receiver_id);

            FriendRequestResponseDto {
                id: req.id.to_hex(),
                sender_id: req.sender_id.to_hex(),
                receiver_id: req.receiver_id.to_hex(),
                sender_username: sender.map(|u| u.username.clone()),
                receiver_username: receiver.map(|u| u.username.clone()),
                sender_avatar: sender.and_then(|u| u.avatar_url.clone()),
                receiver_avatar: receiver.and_then(|u| u.avatar_url.clone()),
                status: req.status,
                created_at: req.created_at,
                updated_at: req.updated_at,
            }
        })
        .collect();

    Ok(FriendRequestsResponse {
        incoming: incoming_dtos,
        outgoing: outgoing_dtos,
    })
}

/// Get paginated incoming friend requests
pub async fn get_incoming_friend_requests(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<PaginatedFriendRequestsResponse, AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");

    // Count total incoming requests
    let incoming_filter = doc! {
        "receiver_id": &user_oid,
        "status": "Pending"
    };
    let total_count = requests_coll
        .count_documents(incoming_filter.clone())
        .await?;

    // Calculate page count
    let page_count = if total_count == 0 {
        0
    } else {
        (total_count + limit - 1) / limit // Ceiling division
    };

    // Calculate skip for pagination
    let skip = (page - 1) * limit;

    // Get paginated incoming requests
    let options = mongodb::options::FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .skip(skip)
        .limit(limit as i64)
        .build();

    let incoming = requests_coll
        .find(incoming_filter)
        .with_options(options)
        .await?
        .try_collect::<Vec<FriendRequest>>()
        .await?;

    if incoming.is_empty() {
        return Ok(PaginatedFriendRequestsResponse {
            requests: Vec::new(),
            metadata: PaginationMetadata {
                total_count,
                page_count,
                current_page: page,
                per_page: limit,
            },
        });
    }

    // Get all user IDs involved in the requests
    let mut user_ids = Vec::new();
    for req in &incoming {
        user_ids.push(req.sender_id);
    }

    // Deduplicate user IDs
    user_ids.sort();
    user_ids.dedup();

    // Fetch all users in a single query
    let users_coll: Collection<User> = db.collection("users");
    let cursor = users_coll
        .find(doc! {
            "_id": { "$in": &user_ids }
        })
        .await?;

    let users: Vec<User> = cursor
        .collect::<Vec<Result<User, _>>>()
        .await
        .into_iter()
        .filter_map(Result::ok)
        .collect();

    let user_map: std::collections::HashMap<ObjectId, User> =
        users.into_iter().map(|user| (user.id, user)).collect();

    // Convert incoming requests to DTOs
    let requests_dtos = incoming
        .into_iter()
        .map(|req| {
            let sender = user_map.get(&req.sender_id);
            let receiver = user_map.get(&req.receiver_id);

            FriendRequestResponseDto {
                id: req.id.to_hex(),
                sender_id: req.sender_id.to_hex(),
                receiver_id: req.receiver_id.to_hex(),
                sender_username: sender.map(|u| u.username.clone()),
                receiver_username: receiver.map(|u| u.username.clone()),
                sender_avatar: sender.and_then(|u| u.avatar_url.clone()),
                receiver_avatar: receiver.and_then(|u| u.avatar_url.clone()),
                status: req.status,
                created_at: req.created_at,
                updated_at: req.updated_at,
            }
        })
        .collect();

    Ok(PaginatedFriendRequestsResponse {
        requests: requests_dtos,
        metadata: PaginationMetadata {
            total_count,
            page_count,
            current_page: page,
            per_page: limit,
        },
    })
}

/// Get paginated outgoing friend requests
pub async fn get_outgoing_friend_requests(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<PaginatedFriendRequestsResponse, AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");

    // Count total outgoing requests
    let outgoing_filter = doc! {
        "sender_id": &user_oid,
        "status": "Pending"
    };
    let total_count = requests_coll
        .count_documents(outgoing_filter.clone())
        .await?;

    // Calculate page count
    let page_count = if total_count == 0 {
        0
    } else {
        (total_count + limit - 1) / limit // Ceiling division
    };

    // Calculate skip for pagination
    let skip = (page - 1) * limit;

    // Get paginated outgoing requests
    let options = mongodb::options::FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .skip(skip)
        .limit(limit as i64)
        .build();

    let outgoing = requests_coll
        .find(outgoing_filter)
        .with_options(options)
        .await?
        .try_collect::<Vec<FriendRequest>>()
        .await?;

    if outgoing.is_empty() {
        return Ok(PaginatedFriendRequestsResponse {
            requests: Vec::new(),
            metadata: PaginationMetadata {
                total_count,
                page_count,
                current_page: page,
                per_page: limit,
            },
        });
    }

    // Get all user IDs involved in the requests
    let mut user_ids = Vec::new();
    for req in &outgoing {
        user_ids.push(req.receiver_id);
    }

    // Deduplicate user IDs
    user_ids.sort();
    user_ids.dedup();

    // Fetch all users in a single query
    let users_coll: Collection<User> = db.collection("users");
    let cursor = users_coll
        .find(doc! {
            "_id": { "$in": &user_ids }
        })
        .await?;

    let users: Vec<User> = cursor
        .collect::<Vec<Result<User, _>>>()
        .await
        .into_iter()
        .filter_map(Result::ok)
        .collect();

    let user_map: std::collections::HashMap<ObjectId, User> =
        users.into_iter().map(|user| (user.id, user)).collect();

    // Convert outgoing requests to DTOs
    let requests_dtos = outgoing
        .into_iter()
        .map(|req| {
            let sender = user_map.get(&req.sender_id);
            let receiver = user_map.get(&req.receiver_id);

            FriendRequestResponseDto {
                id: req.id.to_hex(),
                sender_id: req.sender_id.to_hex(),
                receiver_id: req.receiver_id.to_hex(),
                sender_username: sender.map(|u| u.username.clone()),
                receiver_username: receiver.map(|u| u.username.clone()),
                sender_avatar: sender.and_then(|u| u.avatar_url.clone()),
                receiver_avatar: receiver.and_then(|u| u.avatar_url.clone()),
                status: req.status,
                created_at: req.created_at,
                updated_at: req.updated_at,
            }
        })
        .collect();

    Ok(PaginatedFriendRequestsResponse {
        requests: requests_dtos,
        metadata: PaginationMetadata {
            total_count,
            page_count,
            current_page: page,
            per_page: limit,
        },
    })
}

pub async fn accept_friend_request(
    db: &Database,
    request_id: &str,
    user_id: &str,
) -> Result<FriendRequestResponse, AppError> {
    let request = friends_repository::accept_friend_request(db, request_id, user_id).await?;

    // Get user info to include in the response
    let users_coll: Collection<User> = db.collection("users");
    let sender = users_coll
        .find_one(doc! { "_id": &request.sender_id })
        .await?;
    let receiver = users_coll
        .find_one(doc! { "_id": &request.receiver_id })
        .await?;

    let response_dto = FriendRequestResponseDto {
        id: request.id.to_hex(),
        sender_id: request.sender_id.to_hex(),
        receiver_id: request.receiver_id.to_hex(),
        sender_username: sender.as_ref().map(|u| u.username.clone()),
        receiver_username: receiver.as_ref().map(|u| u.username.clone()),
        sender_avatar: sender.as_ref().and_then(|u| u.avatar_url.clone()),
        receiver_avatar: receiver.as_ref().and_then(|u| u.avatar_url.clone()),
        status: request.status,
        created_at: request.created_at,
        updated_at: request.updated_at,
    };

    Ok(FriendRequestResponse {
        status: "success".to_string(),
        message: "Friend request accepted".to_string(),
        request: Some(response_dto),
    })
}

pub async fn reject_friend_request(
    db: &Database,
    request_id: &str,
    user_id: &str,
) -> Result<FriendRequestResponse, AppError> {
    let request = friends_repository::reject_friend_request(db, request_id, user_id).await?;

    // Get user info to include in the response
    let users_coll: Collection<User> = db.collection("users");
    let sender = users_coll
        .find_one(doc! { "_id": &request.sender_id })
        .await?;
    let receiver = users_coll
        .find_one(doc! { "_id": &request.receiver_id })
        .await?;

    let response_dto = FriendRequestResponseDto {
        id: request.id.to_hex(),
        sender_id: request.sender_id.to_hex(),
        receiver_id: request.receiver_id.to_hex(),
        sender_username: sender.as_ref().map(|u| u.username.clone()),
        receiver_username: receiver.as_ref().map(|u| u.username.clone()),
        sender_avatar: sender.as_ref().and_then(|u| u.avatar_url.clone()),
        receiver_avatar: receiver.as_ref().and_then(|u| u.avatar_url.clone()),
        status: request.status,
        created_at: request.created_at,
        updated_at: request.updated_at,
    };

    Ok(FriendRequestResponse {
        status: "success".to_string(),
        message: "Friend request rejected".to_string(),
        request: Some(response_dto),
    })
}

pub async fn get_friends(db: &Database, user_id: &str) -> Result<FriendListResponse, AppError> {
    let friend_ids = friends_repository::get_friends(db, user_id).await?;

    if friend_ids.is_empty() {
        return Ok(FriendListResponse {
            friends: Vec::new(),
            total: 0,
        });
    }

    // Fetch friend details
    let users_coll: Collection<User> = db.collection("users");
    let cursor = users_coll
        .find(doc! {
            "_id": { "$in": &friend_ids }
        })
        .await?;

    let friends: Vec<User> = cursor
        .collect::<Vec<Result<User, _>>>()
        .await
        .into_iter()
        .filter_map(Result::ok)
        .collect();

    // Convert to friend DTOs
    let friend_dtos: Vec<FriendDto> = friends
        .into_iter()
        .map(|user| FriendDto {
            id: user.id.to_hex(),
            username: user.username,
            avatar_url: user.avatar_url,
            covenant_name: user.covenant_name,
            platform: user.platform,
            region: user.region,
        })
        .collect();

    let total = friend_dtos.len();

    Ok(FriendListResponse {
        friends: friend_dtos,
        total,
    })
}

/// Get paginated friends list with metadata
pub async fn get_friends_paginated(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<PaginatedFriendsResponse, AppError> {
    // Get total count for pagination
    let total_count = friends_repository::count_friends(db, user_id).await?;

    // Calculate page count
    let page_count = if total_count == 0 {
        0
    } else {
        (total_count + limit - 1) / limit // Ceiling division
    };

    // Get paginated friend IDs
    let friend_ids = friends_repository::get_friends_paginated(db, user_id, page, limit).await?;

    if friend_ids.is_empty() {
        return Ok(PaginatedFriendsResponse {
            friends: Vec::new(),
            metadata: PaginationMetadata {
                total_count,
                page_count,
                current_page: page,
                per_page: limit,
            },
        });
    }

    // Fetch friend details
    let users_coll: Collection<User> = db.collection("users");
    let cursor = users_coll
        .find(doc! {
            "_id": { "$in": &friend_ids }
        })
        .await?;

    let friends: Vec<User> = cursor
        .collect::<Vec<Result<User, _>>>()
        .await
        .into_iter()
        .filter_map(Result::ok)
        .collect();

    // Convert to friend DTOs
    let friend_dtos: Vec<FriendDto> = friends
        .into_iter()
        .map(|user| FriendDto {
            id: user.id.to_hex(),
            username: user.username,
            avatar_url: user.avatar_url,
            covenant_name: user.covenant_name,
            platform: user.platform,
            region: user.region,
        })
        .collect();

    Ok(PaginatedFriendsResponse {
        friends: friend_dtos,
        metadata: PaginationMetadata {
            total_count,
            page_count,
            current_page: page,
            per_page: limit,
        },
    })
}

pub async fn remove_friend(db: &Database, user_id: &str, friend_id: &str) -> Result<(), AppError> {
    friends_repository::remove_friend(db, user_id, friend_id).await
}

/// Get the user's friend list with detailed information
pub async fn get_friend_list(db: &Database, user_id: &str) -> Result<Vec<FriendDto>, AppError> {
    let friends = user_repository::get_friend_list_details(db, user_id).await?;

    // Convert to FriendDto objects
    let friend_dtos = friends
        .into_iter()
        .map(|friend| FriendDto {
            id: friend.id.to_hex(),
            username: friend.username,
            avatar_url: friend.avatar_url,
            covenant_name: friend.covenant_name,
            platform: friend.platform,
            region: friend.region,
        })
        .collect();

    Ok(friend_dtos)
}

/// Check if the user has any pending incoming friend requests
pub async fn has_pending_friend_requests(db: &Database, user_id: &str) -> Result<HasPendingFriendRequestsResponse, AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");

    // Count pending incoming requests
    let incoming_filter = doc! {
        "receiver_id": &user_oid,
        "status": "Pending"
    };

    let count = requests_coll.count_documents(incoming_filter).await?;

    Ok(HasPendingFriendRequestsResponse {
        has_pending_requests: count > 0,
    })
}
