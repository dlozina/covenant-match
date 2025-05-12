use crate::models::error::AppError;
use crate::models::friends::{FriendRequest, FriendRequestStatus, Friendship};
use crate::models::user::User;
use futures::TryStreamExt;
use mongodb::bson::{doc, oid::ObjectId, DateTime};
use mongodb::options::FindOptions;
use mongodb::{Collection, Database};

pub async fn create_friend_request(
    db: &Database,
    sender_id: &str,
    receiver_id: &str,
) -> Result<FriendRequest, AppError> {
    // Validate IDs
    let sender_oid = ObjectId::parse_str(sender_id).map_err(|_| AppError::InvalidId)?;
    let receiver_oid = ObjectId::parse_str(receiver_id).map_err(|_| AppError::InvalidId)?;

    // Check if users exist
    let users_coll: Collection<User> = db.collection("users");
    if users_coll
        .find_one(doc! { "_id": &sender_oid })
        .await?
        .is_none()
    {
        return Err(AppError::UserNotFound);
    }
    if users_coll
        .find_one(doc! { "_id": &receiver_oid })
        .await?
        .is_none()
    {
        return Err(AppError::UserNotFound);
    }

    // Check if a friendship already exists
    let friendships_coll: Collection<Friendship> = db.collection("friendships");
    let friendship_exists = friendships_coll
        .find_one(doc! {
            "$or": [
                { "user_id": &sender_oid, "friend_id": &receiver_oid },
                { "user_id": &receiver_oid, "friend_id": &sender_oid }
            ]
        })
        .await?
        .is_some();

    if friendship_exists {
        return Err(AppError::FriendshipAlreadyExists);
    }

    // Check if there's already a pending request between these users
    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");

    // Check for existing request in either direction
    let existing_request = requests_coll
        .find_one(doc! {
            "$or": [
                { "sender_id": &sender_oid, "receiver_id": &receiver_oid, "status": "Pending" },
                { "sender_id": &receiver_oid, "receiver_id": &sender_oid, "status": "Pending" }
            ]
        })
        .await?;

    if let Some(request) = existing_request {
        // If the existing request is from the receiver to the sender, we can auto-accept it
        if request.sender_id == receiver_oid && request.receiver_id == sender_oid {
            // Update the existing request to accepted
            let now = DateTime::now();
            requests_coll
                .update_one(
                    doc! { "_id": request.id },
                    doc! { "$set": { "status": "Accepted", "updated_at": now } },
                )
                .await?;

            // Create friendship records in both directions
            create_friendship(db, &receiver_id, &sender_id).await?;
            create_friendship(db, &sender_id, &receiver_id).await?;

            // Return the updated request
            let updated_request = requests_coll
                .find_one(doc! { "_id": request.id })
                .await?
                .ok_or(AppError::RequestNotFound)?;

            return Ok(updated_request);
        } else {
            return Err(AppError::FriendRequestAlreadyExists);
        }
    }

    // Create new friend request
    let now = DateTime::now();
    let request = FriendRequest {
        id: ObjectId::new(),
        sender_id: sender_oid,
        receiver_id: receiver_oid,
        status: FriendRequestStatus::Pending,
        created_at: now,
        updated_at: now,
    };

    requests_coll.insert_one(&request).await?;
    Ok(request)
}

pub async fn get_friend_requests(
    db: &Database,
    user_id: &str,
) -> Result<(Vec<FriendRequest>, Vec<FriendRequest>), AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");

    // Get incoming requests (where user is receiver)
    let incoming_filter = doc! {
        "receiver_id": &user_oid,
        "status": "Pending"
    };
    let incoming = requests_coll
        .find(incoming_filter)
        .await?
        .try_collect::<Vec<FriendRequest>>()
        .await?;

    // Get outgoing requests (where user is sender)
    let outgoing_filter = doc! {
        "sender_id": &user_oid,
        "status": "Pending"
    };
    let outgoing = requests_coll
        .find(outgoing_filter)
        .await?
        .try_collect::<Vec<FriendRequest>>()
        .await?;

    Ok((incoming, outgoing))
}

pub async fn accept_friend_request(
    db: &Database,
    request_id: &str,
    user_id: &str,
) -> Result<FriendRequest, AppError> {
    let request_oid = ObjectId::parse_str(request_id).map_err(|_| AppError::InvalidId)?;
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");

    // Find the request and ensure the current user is the receiver
    let request = requests_coll
        .find_one(doc! {
            "_id": &request_oid,
            "receiver_id": &user_oid,
            "status": "Pending"
        })
        .await?
        .ok_or(AppError::RequestNotFound)?;

    // Update request status to accepted
    let now = DateTime::now();
    requests_coll
        .update_one(
            doc! { "_id": &request_oid },
            doc! { "$set": { "status": "Accepted", "updated_at": now } },
        )
        .await?;

    // Create friendship in both directions
    let sender_id = request.sender_id.to_hex();
    create_friendship(db, user_id, &sender_id).await?;
    create_friendship(db, &sender_id, user_id).await?;

    // Return updated request
    let updated_request = requests_coll
        .find_one(doc! { "_id": &request_oid })
        .await?
        .ok_or(AppError::RequestNotFound)?;

    Ok(updated_request)
}

pub async fn reject_friend_request(
    db: &Database,
    request_id: &str,
    user_id: &str,
) -> Result<FriendRequest, AppError> {
    let request_oid = ObjectId::parse_str(request_id).map_err(|_| AppError::InvalidId)?;
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");

    // Find the request and ensure the current user is the receiver
    let _request = requests_coll
        .find_one(doc! {
            "_id": &request_oid,
            "receiver_id": &user_oid,
            "status": "Pending"
        })
        .await?
        .ok_or(AppError::RequestNotFound)?;

    // Update request status to rejected
    let now = DateTime::now();
    requests_coll
        .update_one(
            doc! { "_id": &request_oid },
            doc! { "$set": { "status": "Rejected", "updated_at": now } },
        )
        .await?;

    // Return updated request
    let updated_request = requests_coll
        .find_one(doc! { "_id": &request_oid })
        .await?
        .ok_or(AppError::RequestNotFound)?;

    Ok(updated_request)
}

async fn create_friendship(
    db: &Database,
    user_id: &str,
    friend_id: &str,
) -> Result<Friendship, AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let friend_oid = ObjectId::parse_str(friend_id).map_err(|_| AppError::InvalidId)?;

    let friendships_coll: Collection<Friendship> = db.collection("friendships");

    // Check if the friendship already exists
    if friendships_coll
        .find_one(doc! {
            "user_id": &user_oid,
            "friend_id": &friend_oid
        })
        .await?
        .is_some()
    {
        return Err(AppError::FriendshipAlreadyExists);
    }

    // Create new friendship
    let friendship = Friendship {
        id: ObjectId::new(),
        user_id: user_oid,
        friend_id: friend_oid,
        created_at: DateTime::now(),
    };

    friendships_coll.insert_one(&friendship).await?;

    // Also update the user's friend_list field
    let users_coll: Collection<User> = db.collection("users");
    users_coll
        .update_one(
            doc! { "_id": &user_oid },
            doc! { "$addToSet": { "friend_list": &friend_oid } },
        )
        .await?;

    Ok(friendship)
}

pub async fn get_friends(db: &Database, user_id: &str) -> Result<Vec<ObjectId>, AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let friendships_coll: Collection<Friendship> = db.collection("friendships");

    // Find all friendships where the user is the user_id
    let filter = doc! { "user_id": &user_oid };
    let options = FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .build();

    let friendships = friendships_coll
        .find(filter)
        .with_options(options)
        .await?
        .try_collect::<Vec<Friendship>>()
        .await?;

    // Extract friend IDs
    let friend_ids = friendships.into_iter().map(|f| f.friend_id).collect();

    Ok(friend_ids)
}

/// Get friends with pagination
pub async fn get_friends_paginated(
    db: &Database,
    user_id: &str,
    page: u64,
    limit: u64,
) -> Result<Vec<ObjectId>, AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let friendships_coll: Collection<Friendship> = db.collection("friendships");

    // Calculate skip value for pagination
    let skip = (page - 1) * limit;

    // Find all friendships where the user is the user_id
    let filter = doc! { "user_id": &user_oid };
    let options = FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .skip(skip)
        .limit(limit as i64)
        .build();

    let friendships = friendships_coll
        .find(filter)
        .with_options(options)
        .await?
        .try_collect::<Vec<Friendship>>()
        .await?;

    // Extract friend IDs
    let friend_ids = friendships.into_iter().map(|f| f.friend_id).collect();

    Ok(friend_ids)
}

/// Count total number of friends for pagination
pub async fn count_friends(db: &Database, user_id: &str) -> Result<u64, AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let friendships_coll: Collection<Friendship> = db.collection("friendships");

    // Count all friendships where the user is the user_id
    let filter = doc! { "user_id": &user_oid };
    let count = friendships_coll.count_documents(filter).await?;

    Ok(count)
}

pub async fn remove_friend(db: &Database, user_id: &str, friend_id: &str) -> Result<(), AppError> {
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let friend_oid = ObjectId::parse_str(friend_id).map_err(|_| AppError::InvalidId)?;

    let friendships_coll: Collection<Friendship> = db.collection("friendships");

    // Remove friendships in both directions
    friendships_coll
        .delete_many(doc! {
            "$or": [
                { "user_id": &user_oid, "friend_id": &friend_oid },
                { "user_id": &friend_oid, "friend_id": &user_oid }
            ]
        })
        .await?;

    // Update users collection to remove from friend_list
    let users_coll: Collection<User> = db.collection("users");

    // Remove from both users' friend lists
    users_coll
        .update_one(
            doc! { "_id": &user_oid },
            doc! { "$pull": { "friend_list": &friend_oid } },
        )
        .await?;

    users_coll
        .update_one(
            doc! { "_id": &friend_oid },
            doc! { "$pull": { "friend_list": &user_oid } },
        )
        .await?;

    Ok(())
}

pub async fn has_pending_friend_requests(db: &Database, user_id: &str) -> Result<bool, AppError> {
    // Validate ID
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    // Check for pending friend requests
    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");
    let request_count = requests_coll
        .count_documents(doc! {
            "receiver_id": user_oid,
            "status": "Pending"
        })
        .await?;

    Ok(request_count > 0)
}

pub async fn check_friend_status(
    db: &Database,
    user_id: &str,
    target_user_ids: &[String],
) -> Result<(Vec<String>, Vec<String>, Vec<String>), AppError> {
    // Validate user ID
    let user_oid = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;

    // Convert target user IDs to ObjectIds
    let mut target_oids = Vec::new();
    for id in target_user_ids {
        // Skip if the target ID is the same as the user ID (can't be friends with yourself)
        if id == user_id {
            continue;
        }

        match ObjectId::parse_str(id) {
            Ok(oid) => target_oids.push(oid),
            Err(_) => continue, // Skip invalid IDs
        }
    }

    // If no valid target IDs, return empty results
    if target_oids.is_empty() {
        return Ok((Vec::new(), Vec::new(), Vec::new()));
    }

    // Check friendships
    let friendships_coll: Collection<Friendship> = db.collection("friendships");
    let mut friends = Vec::new();

    // Find friendships where user is friends with any of the target users
    let friendship_cursor = friendships_coll
        .find(doc! {
            "$or": [
                { "user_id": &user_oid, "friend_id": { "$in": &target_oids } },
                { "user_id": { "$in": &target_oids }, "friend_id": &user_oid }
            ]
        })
        .await?;

    let friendships: Vec<Friendship> = friendship_cursor.try_collect().await?;

    // Extract friend IDs
    for friendship in &friendships {
        if friendship.user_id == user_oid {
            friends.push(friendship.friend_id.to_hex());
        } else {
            friends.push(friendship.user_id.to_hex());
        }
    }

    // Deduplicate the friends list
    friends.sort();
    friends.dedup();

    // Check friend requests
    let requests_coll: Collection<FriendRequest> = db.collection("friend_requests");

    // Find outgoing requests (from user to target users)
    let outgoing_cursor = requests_coll
        .find(doc! {
            "sender_id": &user_oid,
            "receiver_id": { "$in": &target_oids },
            "status": "Pending"
        })
        .await?;

    let outgoing_requests: Vec<FriendRequest> = outgoing_cursor.try_collect().await?;
    let outgoing_ids: Vec<String> = outgoing_requests
        .iter()
        .map(|req| req.receiver_id.to_hex())
        .collect();

    // Find incoming requests (from target users to user)
    let incoming_cursor = requests_coll
        .find(doc! {
            "sender_id": { "$in": &target_oids },
            "receiver_id": &user_oid,
            "status": "Pending"
        })
        .await?;

    let incoming_requests: Vec<FriendRequest> = incoming_cursor.try_collect().await?;
    let incoming_ids: Vec<String> = incoming_requests
        .iter()
        .map(|req| req.sender_id.to_hex())
        .collect();

    Ok((friends, outgoing_ids, incoming_ids))
}
