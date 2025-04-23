use crate::models::error::AppError;
use crate::models::news::{CreateNewsDto, News, NewsResponse, UpdateNewsDto};
use crate::repository::news_repository;
use mongodb::bson::{doc, oid::ObjectId};
use mongodb::Database;

pub async fn create_news(
    db: &Database,
    news_data: CreateNewsDto,
    author_id: &str,
    author_username: &str,
) -> Result<NewsResponse, AppError> {
    // Create a new News object
    let now = mongodb::bson::DateTime::now();
    let news = News {
        id: ObjectId::new(),
        title: news_data.title,
        content: news_data.content,
        summary: news_data.summary,
        image_url: news_data.image_url,
        author_id: author_id.to_string(),
        author_username: author_username.to_string(),
        updated_by_id: author_id.to_string(),
        updated_by_username: author_username.to_string(),
        published: news_data.published.unwrap_or(false),
        created_at: now,
        updated_at: now,
    };

    // Save the news to the database
    news_repository::create_news(db, &news).await?;

    // Convert to response DTO
    Ok(news.into())
}

pub async fn get_news_by_id(db: &Database, news_id: &str) -> Result<NewsResponse, AppError> {
    // Find the news post by ID
    let news = news_repository::find_news_by_id(db, news_id)
        .await?
        .ok_or(AppError::NewsNotFound)?;

    // Convert to response DTO
    Ok(news.into())
}

pub async fn get_all_news(
    db: &Database,
    page: u64,
    limit: u64,
) -> Result<(Vec<NewsResponse>, u64, u64), AppError> {
    // Ensure page and limit are valid
    let page = if page < 1 { 1 } else { page };
    let limit = if limit < 1 { 10 } else { limit };

    // Get total count for pagination metadata
    let total = news_repository::count_news(db).await?;

    // Get paginated news posts
    let news_posts = news_repository::find_news_paginated(db, page, limit).await?;

    // Convert to response DTOs
    let news_responses: Vec<NewsResponse> =
        news_posts.into_iter().map(NewsResponse::from).collect();

    Ok((news_responses, total, page))
}

pub async fn update_news(
    db: &Database,
    news_id: &str,
    update_data: UpdateNewsDto,
    updater_id: &str,
    updater_username: &str,
) -> Result<NewsResponse, AppError> {
    // Get the current timestamp
    let now = mongodb::bson::DateTime::now();

    // Create update document
    let mut update_doc = doc! {
        "updated_at": now,
        "updated_by_id": updater_id.to_string(),
        "updated_by_username": updater_username.to_string()
    };

    if let Some(title) = update_data.title {
        update_doc.insert("title", title);
    }
    if let Some(content) = update_data.content {
        update_doc.insert("content", content);
    }
    if let Some(summary) = update_data.summary {
        update_doc.insert("summary", summary);
    }
    if let Some(image_url) = update_data.image_url {
        update_doc.insert("image_url", image_url);
    }
    if let Some(published) = update_data.published {
        update_doc.insert("published", published);
    }

    // Update the news post
    let updated_news = news_repository::update_news(db, news_id, update_doc)
        .await?
        .ok_or(AppError::NewsNotFound)?;

    // Convert to response DTO
    Ok(updated_news.into())
}

pub async fn delete_news(db: &Database, news_id: &str) -> Result<(), AppError> {
    // Delete the news post
    let deleted = news_repository::delete_news(db, news_id).await?;

    if deleted {
        Ok(())
    } else {
        Err(AppError::NewsNotFound)
    }
}

pub async fn get_recent_news(db: &Database, limit: u64) -> Result<Vec<NewsResponse>, AppError> {
    log::info!("get_recent_news service called with limit: {}", limit);

    // Ensure limit is reasonable
    let limit = limit.min(20); // Cap at 20 to prevent huge queries

    // Use the new function that doesn't require ID validation
    log::info!("Using find_all_news instead of find_recent_news");

    // Directly call find_all_news which has no ID validation
    let all_news = match news_repository::find_all_news(db).await {
        Ok(posts) => {
            log::info!("Successfully retrieved {} news posts", posts.len());
            posts
        }
        Err(e) => {
            log::error!("Error in find_all_news: {:?}", e);
            // Return an empty vector instead of propagating the error
            return Ok(Vec::new());
        }
    };

    // Convert to response DTOs, only use published news, and limit the number
    let news_responses: Vec<NewsResponse> = all_news
        .into_iter()
        .filter(|news| news.published)
        .map(|news| {
            log::info!(
                "Including news item: id={}, title={}",
                news.id.to_hex(),
                news.title
            );
            NewsResponse::from(news)
        })
        .take(limit as usize) // Apply the limit
        .collect();

    log::info!("Returning {} news responses", news_responses.len());
    Ok(news_responses)
}
