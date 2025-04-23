use crate::models::error::AppError;
use crate::models::news::{News, NewsResponse};
use futures::{StreamExt, TryStreamExt};
use log::error;
use mongodb::{
    bson::{doc, oid::ObjectId, Document},
    Collection, Database,
};

const COLLECTION_NAME: &str = "news";

fn get_collection(db: &Database) -> Collection<News> {
    db.collection::<News>(COLLECTION_NAME)
}

pub async fn create_news(db: &Database, news: &News) -> Result<(), AppError> {
    let collection = get_collection(db);
    collection.insert_one(news).await.map_err(|e| {
        error!("Database error creating news post: {:?}", e);
        AppError::DatabaseError(e)
    })?;
    Ok(())
}

pub async fn find_news_by_id(db: &Database, id: &str) -> Result<Option<News>, AppError> {
    let collection = get_collection(db);

    // Check if the ID looks like a valid ObjectId (24 hex chars)
    if id.len() != 24 || !id.chars().all(|c| c.is_digit(16)) {
        return Err(AppError::InvalidId);
    }

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! { "_id": object_id };

    collection.find_one(filter).await.map_err(|e| {
        error!("Database error finding news by id: {:?}", e);
        AppError::DatabaseError(e)
    })
}

pub async fn find_news_paginated(
    db: &Database,
    page: u64,
    limit: u64,
) -> Result<Vec<News>, AppError> {
    let collection = get_collection(db);
    log::info!("Fetching news with page: {}, limit: {}", page, limit);

    // Calculate skip value for pagination
    let skip = (page - 1) * limit;

    // Create a filter document - no filter means return all news including drafts
    let filter = doc! {};

    // Use the find method without options
    let mut cursor = collection.find(filter).await.map_err(|e| {
        error!("Database error fetching paginated news: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect all results first
    let mut news = Vec::new();

    while let Some(result) = cursor.next().await {
        match result {
            Ok(item) => {
                log::debug!("Found news item: {:?}", item.id);
                news.push(item);
            }
            Err(e) => {
                error!("Error getting news item: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    log::info!("Total news items found: {}", news.len());

    // Sort manually by created_at descending
    news.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Apply pagination manually
    let start = std::cmp::min(skip as usize, news.len());
    let end = std::cmp::min(start + limit as usize, news.len());

    log::info!("Returning news items from index {} to {}", start, end);

    Ok(news[start..end].to_vec())
}

pub async fn count_news(db: &Database) -> Result<u64, AppError> {
    let collection = get_collection(db);
    let filter = doc! {};

    collection.count_documents(filter).await.map_err(|e| {
        error!("Database error counting news: {:?}", e);
        AppError::DatabaseError(e)
    })
}

pub async fn update_news(
    db: &Database,
    news_id: &str,
    update_doc: Document,
) -> Result<Option<News>, AppError> {
    let collection = get_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(news_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! { "_id": object_id };

    let update = doc! { "$set": update_doc };

    let result = collection
        .update_one(filter.clone(), update)
        .await
        .map_err(|e| {
            error!("Database error updating news: {:?}", e);
            AppError::DatabaseError(e)
        })?;

    if result.matched_count == 0 {
        return Ok(None); // News post not found
    }

    // Fetch the updated document
    collection.find_one(filter).await.map_err(|e| {
        error!("Database error fetching updated news: {:?}", e);
        AppError::DatabaseError(e)
    })
}

pub async fn delete_news(db: &Database, news_id: &str) -> Result<bool, AppError> {
    let collection = get_collection(db);

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(news_id).map_err(|_| AppError::InvalidId)?;

    let filter = doc! { "_id": object_id };

    let result = collection.delete_one(filter).await.map_err(|e| {
        error!("Database error deleting news: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(result.deleted_count > 0)
}

pub async fn find_recent_news(db: &Database, limit: u64) -> Result<Vec<News>, AppError> {
    let collection = get_collection(db);

    // Filter for published news only (for public view)
    let filter = doc! { "published": true };
    log::info!("Fetching recent news with limit: {}, published only", limit);

    // Find all published news
    let mut cursor = collection.find(filter).await.map_err(|e| {
        error!("Database error fetching recent news: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect results up to limit
    let mut news = Vec::new();
    let mut count = 0;

    while let Some(result) = cursor.next().await {
        if count >= limit {
            break;
        }

        match result {
            Ok(item) => {
                log::debug!("Found recent news item: {:?}", item.id);
                news.push(item);
                count += 1;
            }
            Err(e) => {
                error!("Error getting recent news item: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    // Sort by created_at (descending) after fetching
    news.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    log::info!("Returning {} recent news items", news.len());

    Ok(news)
}
