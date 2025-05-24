use crate::models::error::AppError;
use crate::models::payment::Donor;
use futures::TryStreamExt;
use log::error;
use mongodb::{
    bson::{doc, oid::ObjectId, DateTime},
    Collection, Database,
};

const COLLECTION_NAME: &str = "donors";

fn get_collection(db: &Database) -> Collection<Donor> {
    db.collection::<Donor>(COLLECTION_NAME)
}

pub async fn create_donor(db: &Database, donor: &Donor) -> Result<Donor, AppError> {
    let collection = get_collection(db);
    let result = collection.insert_one(donor).await.map_err(|e| {
        error!("Database error creating donor: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Get the inserted document
    let inserted_donor = collection
        .find_one(doc! { "_id": result.inserted_id })
        .await
        .map_err(AppError::DatabaseError)?
        .ok_or_else(|| {
            error!("Failed to find inserted donor");
            AppError::DatabaseError(mongodb::error::Error::from(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Failed to find inserted donor",
            )))
        })?;

    Ok(inserted_donor)
}

pub async fn find_donors_paginated(
    db: &Database,
    page: u64,
    limit: u64,
) -> Result<(Vec<Donor>, u64), AppError> {
    let collection = get_collection(db);

    // Calculate skip value for pagination
    let skip = (page - 1) * limit;

    // Get total count
    let total = collection.count_documents(doc! {}).await?;

    // Get paginated results
    let cursor = collection
        .find(doc! {})
        .await
        .map_err(AppError::DatabaseError)?;

    let mut donors: Vec<Donor> = cursor.try_collect().await?;

    // Sort by date descending
    donors.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Apply pagination manually
    let start = skip as usize;
    let end = (skip + limit) as usize;

    if start < donors.len() {
        let end_idx = if end < donors.len() {
            end
        } else {
            donors.len()
        };
        donors = donors[start..end_idx].to_vec();
    } else {
        donors.clear();
    }

    Ok((donors, total))
}

pub async fn count_donors(db: &Database) -> Result<u64, AppError> {
    let collection = get_collection(db);
    collection
        .count_documents(doc! {})
        .await
        .map_err(AppError::DatabaseError)
}
