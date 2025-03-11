use crate::models::error::AppError;
use crate::models::user::User;
use futures::TryStreamExt;
use log::error;
use mongodb::{
    bson::{self, doc, Document},
    options::FindOneOptions,
    Collection, Database,
};

const COLLECTION_NAME: &str = "users";

fn get_collection(db: &Database) -> Collection<User> {
    db.collection::<User>(COLLECTION_NAME)
}

pub async fn create_user(db: &Database, user: &User) -> Result<(), AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);
    collection.insert_one(user, None).await.map_err(|e| {
        error!("Database error creating user: {:?}", e);
        AppError::DatabaseError(e)
    })?;
    Ok(())
}

pub async fn find_by_username(db: &Database, username: &str) -> Result<Option<User>, AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);
    let filter = doc! { "username": username };

    collection.find_one(filter, None).await.map_err(|e| {
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

    collection.find_one(filter, None).await.map_err(|e| {
        error!("Database error finding user by username or email: {:?}", e);
        AppError::DatabaseError(e)
    })
}

// TODO: Maybe _id needs to be renamed to id
pub async fn find_user_by_id(db: &Database, id: &str) -> Result<Option<User>, AppError> {
    let collection = db.collection::<User>(COLLECTION_NAME);
    let filter = doc! { "_id": id };

    collection.find_one(filter, None).await.map_err(|e| {
        error!("Database error finding user by id: {:?}", e);
        AppError::DatabaseError(e)
    })
}

pub async fn admin_exists(db: &Database) -> Result<bool, AppError> {
    let collection: Collection<User> = db.collection(COLLECTION_NAME);
    let filter = doc! { "role": "admin" };

    let count = collection
        .count_documents(filter, None)
        .await
        .map_err(|e| {
            error!("Database error checking if admin exists: {:?}", e);
            AppError::DatabaseError(e)
        })?;

    Ok(count > 0)
}

pub async fn find_by_email(db: &Database, email: &str) -> Result<Option<User>, AppError> {
    let user = get_collection(db)
        .find_one(doc! { "email": email }, None)
        .await?;
    Ok(user)
}

pub async fn update_user(db: &Database, user: &User) -> Result<(), AppError> {
    let update = doc! {
        "$set": {
            "username": &user.username,
            "email": &user.email,
            "password_hash": &user.password_hash,
            "display_name": &user.display_name,
            "avatar_url": &user.avatar_url,
            "updated_at": bson::DateTime::from(std::time::SystemTime::from(user.updated_at)),
        }
    };

    get_collection(db)
        .update_one(doc! { "_id": &user.id }, update, None)
        .await?;

    Ok(())
}

pub async fn delete_user(db: &Database, user_id: &str) -> Result<(), AppError> {
    let collection = get_collection(db);
    let filter = doc! { "_id": user_id };

    let result = collection.delete_one(filter, None).await.map_err(|e| {
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

    let filter = doc! { "_id": user_id };
    let update = doc! { "$set": update_doc };

    let result = collection
        .update_one(filter, update, None)
        .await
        .map_err(|e| {
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
        .find_one(filter, None)
        .await
        .map_err(AppError::DatabaseError)
}
