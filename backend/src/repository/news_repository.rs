use crate::models::error::AppError;
use crate::models::news::{News, NewsResponse};
use futures::StreamExt;
use log::error;
use mongodb::{
    bson::{doc, oid::ObjectId, Document},
    Collection, Database,
};
use regex;

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

pub async fn find_news_by_id(
    db: &Database,
    id: &str,
    admin_mode: bool,
) -> Result<Option<News>, AppError> {
    let collection = get_collection(db);

    // Check if the ID looks like a valid ObjectId (24 hex chars)
    if id.len() != 24 || !id.chars().all(|c| c.is_digit(16)) {
        return Err(AppError::InvalidId);
    }

    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(id).map_err(|_| AppError::InvalidId)?;

    // Create the base filter with ID
    let mut filter = doc! { "_id": object_id };

    // If not in admin mode, only show published news
    if !admin_mode {
        filter.insert("published", true);
    }

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

    // Create a filter document - only return published news
    let filter = doc! { "published": true };

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
    let filter = doc! { "published": true };

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
    log::info!("find_recent_news repository called with limit: {}", limit);

    // Filter for published news only
    let filter = doc! { "published": true };
    log::info!("Using filter for published news only");

    // Execute the find query
    let mut cursor = match collection.find(filter).await {
        Ok(cursor) => {
            log::info!("MongoDB find query executed successfully");
            cursor
        }
        Err(e) => {
            log::error!("MongoDB find query failed: {:?}", e);
            return Err(AppError::DatabaseError(e));
        }
    };

    // Collect all items
    let mut news = Vec::new();

    while let Some(result) = cursor.next().await {
        match result {
            Ok(item) => {
                // Log before pushing to avoid using the moved value
                let item_id = item.id.to_hex();
                log::info!(
                    "Added news item to results: id={}, title={}",
                    item_id,
                    item.title
                );
                news.push(item);
            }
            Err(e) => {
                log::error!("Error getting news item: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    log::info!("Found total of {} news items", news.len());

    // Sort by created_at (descending) after fetching
    news.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Apply limit
    if news.len() > limit as usize {
        news.truncate(limit as usize);
    }

    log::info!("Returning {} news items after limit applied", news.len());

    Ok(news)
}

// Add a new function that doesn't attempt any ID validation
pub async fn find_all_news(db: &Database) -> Result<Vec<News>, AppError> {
    let collection = get_collection(db);

    // Get all news items
    log::info!("find_all_news: querying all news");

    let filter = doc! { "published": true };

    match collection.find(filter).await {
        Ok(cursor) => {
            let mut news = Vec::new();
            let mut stream = cursor;

            while let Some(doc) = stream.next().await {
                match doc {
                    Ok(news_item) => news.push(news_item),
                    Err(e) => {
                        log::error!("Error getting news item: {:?}", e);
                        return Err(AppError::DatabaseError(e));
                    }
                }
            }

            // Sort by date descending
            news.sort_by(|a, b| b.created_at.cmp(&a.created_at));

            log::info!("Found {} news items", news.len());
            Ok(news)
        }
        Err(e) => {
            log::error!("MongoDB find query failed: {:?}", e);
            Err(AppError::DatabaseError(e))
        }
    }
}

// Function to find news with search term
pub async fn find_news_with_search(
    db: &Database,
    page: u64,
    limit: u64,
    search: String,
) -> Result<(Vec<News>, u64), AppError> {
    let collection = get_collection(db);
    log::info!(
        "Searching news with term: '{}', page: {}, limit: {}",
        search,
        page,
        limit
    );

    // Calculate skip value for pagination
    let skip = (page - 1) * limit;

    // Create a search filter using regex for case-insensitive search
    // This searches in title, content, and summary fields
    let search_regex = format!(".*{}.*", regex::escape(&search));
    let filter = doc! {
        "$and": [
            { "published": true },
            { "$or": [
                { "title": { "$regex": &search_regex, "$options": "i" } },
                { "content": { "$regex": &search_regex, "$options": "i" } },
                { "summary": { "$regex": &search_regex, "$options": "i" } }
            ]}
        ]
    };

    // Get all matching documents first (for accurate counting)
    let mut cursor = collection.find(filter.clone()).await.map_err(|e| {
        error!("Database error searching news: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect all matching results
    let mut news = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(item) => {
                log::debug!("Found matching news item: {:?}", item.id);
                news.push(item);
            }
            Err(e) => {
                error!("Error getting news item: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    log::info!("Found {} news items matching search", news.len());

    // Sort manually by created_at descending
    news.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Get total count for pagination
    let total = news.len() as u64;

    // Apply pagination manually
    let start = std::cmp::min(skip as usize, news.len());
    let end = std::cmp::min(start + limit as usize, news.len());

    log::info!("Returning news items from index {} to {}", start, end);

    Ok((news[start..end].to_vec(), total))
}
