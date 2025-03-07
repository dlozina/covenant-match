use crate::models::error::AppError;
use crate::models::user::User;
use futures::TryStreamExt;
use mongodb::{
    bson::{self, doc, Document},
    options::FindOneOptions,
    Collection, Database,
};

fn get_collection(db: &Database) -> Collection<User> {
    db.collection::<User>("users")
}

pub async fn create_user(db: &Database, user: &User) -> Result<(), AppError> {
    get_collection(db).insert_one(user, None).await?;
    Ok(())
}

pub async fn find_by_id(db: &Database, id: &str) -> Result<Option<User>, AppError> {
    let user = get_collection(db)
        .find_one(doc! { "_id": id }, None)
        .await?;
    Ok(user)
}

pub async fn find_by_username(db: &Database, username: &str) -> Result<Option<User>, AppError> {
    let user = get_collection(db)
        .find_one(doc! { "username": username }, None)
        .await?;
    Ok(user)
}

pub async fn find_by_email(db: &Database, email: &str) -> Result<Option<User>, AppError> {
    let user = get_collection(db)
        .find_one(doc! { "email": email }, None)
        .await?;
    Ok(user)
}

pub async fn find_by_username_or_email(
    db: &Database,
    username: &str,
    email: &str,
) -> Result<Option<User>, AppError> {
    let user = get_collection(db)
        .find_one(
            doc! {
                "$or": [
                    { "username": username },
                    { "email": email }
                ]
            },
            None,
        )
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
