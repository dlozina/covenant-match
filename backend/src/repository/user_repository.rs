use crate::models::error::AppError;
use crate::models::user::User;
use futures::StreamExt;
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
