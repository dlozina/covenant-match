use crate::models::error::AppError;
use crate::models::user::User;
use futures::{StreamExt, TryStreamExt};
use log::error;
use mongodb::{
    bson::{doc, oid::ObjectId, Document},
    Collection, Database,
};

const COLLECTION_NAME: &str = "users";

fn get_collection(db: &Database) -> Collection<User> {
    db.collection::<User>(COLLECTION_NAME)
}

pub async fn create_user(db: &Database, user: &User) -> Result<(), AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);
    collection.insert_one(user).await.map_err(|e| {
        error!("Database error creating user: {:?}", e);
        AppError::DatabaseError(e)
    })?;
    Ok(())
}

pub async fn find_by_username(db: &Database, username: &str) -> Result<Option<User>, AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);
    let filter = doc! { "username": username };

    collection.find_one(filter).await.map_err(|e| {
        error!("Database error finding user by username: {:?}", e);
        AppError::DatabaseError(e)
    })
}

pub async fn find_by_username_or_email(
    db: &Database,
    username: &str,
    email: &str,
) -> Result<Option<User>, AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);
    let filter = doc! {
        "$or": [
            { "username": username },
            { "email": email }
        ]
    };

    collection.find_one(filter).await.map_err(|e| {
        error!("Database error finding user by username or email: {:?}", e);
        AppError::DatabaseError(e)
    })
}

pub async fn find_user_by_id(db: &Database, id: &str) -> Result<Option<User>, AppError> {
    log::info!("Finding user by ID: {}", id);
    let collection = db.collection::<User>(COLLECTION_NAME);

    // Check if the ID looks like a valid ObjectId (24 hex chars)
    if id.len() != 24 || !id.chars().all(|c| c.is_digit(16)) {
        log::warn!(
            "Invalid user ID format (not a valid MongoDB ObjectId): {}",
            id
        );
        return Err(AppError::InvalidId);
    }

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(id).map_err(|e| {
        log::error!("Failed to parse ObjectId from string {}: {:?}", id, e);
        AppError::InvalidId
    })?;

    let filter = doc! { "_id": object_id };

    log::info!(
        "Querying database for user with ObjectId: {}",
        object_id.to_hex()
    );

    let result = collection.find_one(filter).await;

    match &result {
        Ok(Some(_)) => log::info!("User found with ID: {}", id),
        Ok(None) => log::info!("No user found with ID: {}", id),
        Err(e) => log::error!("Database error finding user by id {}: {:?}", id, e),
    }

    result.map_err(|e| {
        error!("Database error finding user by id: {:?}", e);
        AppError::DatabaseError(e)
    })
}

pub async fn admin_exists(db: &Database) -> Result<bool, AppError> {
    let collection: Collection<User> = db.collection(COLLECTION_NAME);
    let filter = doc! { "role": "admin" };

    let count = collection.count_documents(filter).await.map_err(|e| {
        error!("Database error checking if admin exists: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(count > 0)
}

pub async fn find_by_email(db: &Database, email: &str) -> Result<Option<User>, AppError> {
    let user = get_collection(db).find_one(doc! { "email": email }).await?;
    Ok(user)
}

pub async fn delete_user(db: &Database, user_id: &str) -> Result<(), AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(user_id).map_err(|e| {
        error!("Invalid ObjectId format: {:?}", e);
        AppError::InvalidId
    })?;

    let filter = doc! { "_id": object_id };

    let result = collection.delete_one(filter).await.map_err(|e| {
        error!("Database error deleting user: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    if result.deleted_count == 0 {
        // This should not happen as we check existence before, but just in case
        return Err(AppError::UserNotFound);
    }

    Ok(())
}

pub async fn update_user_with_doc(
    db: &Database,
    user_id: &str,
    update_doc: Document,
) -> Result<Option<User>, AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(user_id).map_err(|e| {
        error!("Invalid ObjectId format: {:?}", e);
        AppError::InvalidId
    })?;

    let filter = doc! { "_id": object_id };

    let update = doc! { "$set": update_doc };

    let result = collection.update_one(filter, update).await.map_err(|e| {
        error!("Database error updating user: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    if result.matched_count == 0 {
        return Ok(None);
    }

    find_user_by_id(db, user_id).await
}

pub async fn find_by_display_name(
    db: &Database,
    display_name: &str,
) -> Result<Option<User>, AppError> {
    let collection = db.collection::<User>("users");
    let filter = doc! { "display_name": display_name };

    collection
        .find_one(filter)
        .await
        .map_err(AppError::DatabaseError)
}

/// Find users by role with pagination
pub async fn find_users_by_role_paginated(
    db: &Database,
    role: Option<&str>,
    page: u64,
    limit: u64,
) -> Result<Vec<User>, AppError> {
    let collection = db.collection::<User>("users");

    let filter = match role {
        Some(role_value) => doc! { "role": role_value },
        None => doc! {},
    };

    // Calculate skip value for pagination
    let skip = (page - 1) * limit;

    // Use individual operations for pagination instead of options
    let mut cursor = collection
        .find(filter)
        .await
        .map_err(AppError::DatabaseError)?;

    // Skip documents
    for _ in 0..skip {
        if cursor.advance().await.map_err(AppError::DatabaseError)? {
            continue;
        } else {
            break;
        }
    }

    // Collect results with limit
    let mut users = Vec::new();
    let mut count = 0;

    while let Some(result) = cursor.next().await {
        if count >= limit {
            break;
        }

        match result {
            Ok(user) => {
                users.push(user);
                count += 1;
            }
            Err(e) => return Err(AppError::DatabaseError(e)),
        }
    }

    Ok(users)
}

/// Count total users by role
pub async fn count_users_by_role(db: &Database, role: Option<&str>) -> Result<u64, AppError> {
    let collection = db.collection::<User>("users");

    let filter = match role {
        Some(role_value) => doc! { "role": role_value },
        None => doc! {},
    };

    collection
        .count_documents(filter)
        .await
        .map_err(AppError::DatabaseError)
}

/// Add a friend to a user's friend list
pub async fn add_friend(db: &Database, user_id: &str, friend_id: &str) -> Result<(), AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);

    // Convert string IDs to ObjectId
    let user_object_id = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let friend_object_id = ObjectId::parse_str(friend_id).map_err(|_| AppError::InvalidId)?;

    // Check if the friend_id is valid (exists in the database)
    let friend_filter = doc! { "_id": friend_object_id.clone() };
    let friend_exists = collection.find_one(friend_filter).await.map_err(|e| {
        error!("Database error checking friend existence: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    if friend_exists.is_none() {
        return Err(AppError::UserNotFound);
    }

    // Check if the friend is already in the list
    let user_filter = doc! {
        "_id": user_object_id.clone(),
        "friend_list": { "$in": [friend_object_id.clone()] }
    };

    let already_added = collection.find_one(user_filter).await.map_err(|e| {
        error!("Database error checking if friend already added: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    if already_added.is_some() {
        // Friend is already in the list
        return Ok(());
    }

    // Count existing friends to enforce limit
    let user = find_user_by_id(db, user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;
    if user.friend_list.len() >= 20 {
        return Err(AppError::FriendLimitReached);
    }

    // Add friend to list
    let filter = doc! { "_id": user_object_id };
    let update = doc! {
        "$addToSet": { "friend_list": friend_object_id },
        "$set": { "updated_at": mongodb::bson::DateTime::now() }
    };

    collection.update_one(filter, update).await.map_err(|e| {
        error!("Database error adding friend: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(())
}

/// Remove a friend from a user's friend list
pub async fn remove_friend(db: &Database, user_id: &str, friend_id: &str) -> Result<(), AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);

    // Convert string IDs to ObjectId
    let user_object_id = ObjectId::parse_str(user_id).map_err(|_| AppError::InvalidId)?;
    let friend_object_id = ObjectId::parse_str(friend_id).map_err(|_| AppError::InvalidId)?;

    // Remove friend from list
    let filter = doc! { "_id": user_object_id };
    let update = doc! {
        "$pull": { "friend_list": friend_object_id },
        "$set": { "updated_at": mongodb::bson::DateTime::now() }
    };

    let result = collection.update_one(filter, update).await.map_err(|e| {
        error!("Database error removing friend: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    if result.matched_count == 0 {
        return Err(AppError::UserNotFound);
    }

    Ok(())
}

/// Get a user's friend list with details
pub async fn get_friend_list_details(db: &Database, user_id: &str) -> Result<Vec<User>, AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);

    // Get the user first to access their friend list
    let user = find_user_by_id(db, user_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    if user.friend_list.is_empty() {
        return Ok(vec![]);
    }

    // Find all friends by their IDs
    let filter = doc! { "_id": { "$in": &user.friend_list } };
    let cursor = collection.find(filter).await.map_err(|e| {
        error!("Database error finding friends: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Use try_collect to transform cursor into Vec<User>
    let friends_list = cursor.try_collect().await.map_err(|e| {
        error!("Error collecting friend results: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(friends_list)
}
