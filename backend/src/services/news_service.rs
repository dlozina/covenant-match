use crate::models::error::AppError;
use crate::models::news::{
    Announcement, AnnouncementResponse, CreateNewsDto, News, NewsResponse, UpdateAnnouncementDto,
    UpdateNewsDto,
};
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

pub async fn get_news_by_id(
    db: &Database,
    news_id: &str,
    admin_mode: bool,
) -> Result<NewsResponse, AppError> {
    // Find the news post by ID, with admin mode flag
    let news = news_repository::find_news_by_id(db, news_id, admin_mode)
        .await?
        .ok_or(AppError::NewsNotFound)?;

    // Convert to response DTO
    Ok(news.into())
}

pub async fn get_all_news(
    db: &Database,
    page: u64,
    limit: u64,
    search: Option<String>,
    admin_mode: bool,
) -> Result<(Vec<NewsResponse>, u64, u64), AppError> {
    let (news, total) = if let Some(search_term) = search {
        // Use search function if search term is provided
        news_repository::find_news_with_search(db, page, limit, search_term, admin_mode).await?
    } else {
        // Use regular function if no search term
        let news = news_repository::find_news_paginated(db, page, limit, admin_mode).await?;
        let total = news_repository::count_news(db, admin_mode).await?;
        (news, total)
    };

    // Convert all news to response DTOs
    let news_responses: Vec<NewsResponse> = news.into_iter().map(|n| n.into()).collect();

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

pub async fn get_current_announcement(db: &Database) -> Result<AnnouncementResponse, AppError> {
    // Try to get the current announcement
    let announcement_result = news_repository::find_current_announcement(db).await?;

    // If an announcement exists, return it
    if let Some(announcement) = announcement_result {
        return Ok(announcement.to_response());
    }

    // If no announcement exists send error
    log::error!("Announcement not found!");

    Err(AppError::AnnouncementNotFound)
}

pub async fn update_announcement(
    db: &Database,
    update_data: UpdateAnnouncementDto,
    updater_id: &str,
) -> Result<AnnouncementResponse, AppError> {
    // Get the current timestamp
    let now = mongodb::bson::DateTime::now();

    // Get user information
    let user = crate::repository::user_repository::find_user_by_id(db, updater_id)
        .await?
        .ok_or(AppError::UserNotFound)?;

    // Create update document - ignore the updatedAt field from the DTO
    let update_doc = doc! {
        "active": update_data.active,
        "content": update_data.content,
        "updated_by_id": updater_id.to_string(),
        "updated_by_username": user.username,
        "updated_at": now
    };

    // Update the announcement
    let updated_announcement = news_repository::update_announcement(db, update_doc)
        .await?
        .ok_or(AppError::AnnouncementNotFound)?;

    Ok(updated_announcement.to_response())
}
