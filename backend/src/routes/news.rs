use crate::models::news::{CreateNewsDto, NewsResponse, UpdateNewsDto};
use crate::services::news_service;
use crate::services::user_service;
use crate::utils::jwt;
use actix_multipart::Multipart;
use actix_web::{
    delete, get, http::header::ContentType, post, put, web, HttpMessage, HttpRequest, HttpResponse,
    Responder, ResponseError,
};
use futures_util::{StreamExt, TryStreamExt};
use mongodb::Database;
use std::path::Path;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

/// Get all news posts
#[utoipa::path(
    get,
    path = "/api/v1/news",
    params(
        ("limit" = Option<u64>, Query, description = "Limit the number of results (default: 10)"),
        ("page" = Option<u64>, Query, description = "Page number (default: 1)")
    ),
    responses(
        (status = 200, description = "News posts retrieved successfully", body = NewsListResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "news"
)]
#[get("/api/v1/news")]
async fn get_all_news(
    db: web::Data<Database>,
    query: web::Query<crate::models::common::PaginationQuery>,
) -> impl Responder {
    match news_service::get_all_news(&db, query.page.unwrap_or(1), query.limit.unwrap_or(10)).await
    {
        Ok((news, total, page)) => {
            // Calculate total pages
            let total_pages = if query.limit.unwrap_or(10) > 0 {
                (total + query.limit.unwrap_or(10) - 1) / query.limit.unwrap_or(10)
            } else {
                0
            };

            HttpResponse::Ok().json(serde_json::json!({
                "status": "success",
                "data": {
                    "news": news,
                    "pagination": {
                        "total": total,
                        "page": page,
                        "limit": query.limit.unwrap_or(10),
                        "total_pages": total_pages
                    }
                }
            }))
        }
        Err(e) => {
            log::error!("Error fetching news: {:?}", e);
            e.error_response()
        }
    }
}

/// Get a specific news post by ID
#[utoipa::path(
    get,
    path = "/api/v1/news/{news_id}",
    params(
        ("news_id" = String, Path, description = "News post ID")
    ),
    responses(
        (status = 200, description = "News post retrieved successfully", body = NewsResponse),
        (status = 404, description = "News post not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "news"
)]
#[get("/api/v1/news/{news_id}")]
async fn get_news_by_id(db: web::Data<Database>, path: web::Path<String>) -> impl Responder {
    let news_id = path.into_inner();

    match news_service::get_news_by_id(&db, &news_id).await {
        Ok(news) => HttpResponse::Ok().json(news),
        Err(e) => {
            log::error!("Error fetching news: {:?}", e);
            e.error_response()
        }
    }
}

/// Create a new news post (admin only)
#[utoipa::path(
    post,
    path = "/api/v1/admin/news",
    request_body = CreateNewsDto,
    responses(
        (status = 201, description = "News post created successfully", body = NewsResponse),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[post("/api/v1/admin/news")]
async fn create_news(
    db: web::Data<Database>,
    mut payload: Multipart,
    json: Option<web::Json<CreateNewsDto>>,
    req: HttpRequest,
) -> impl Responder {
    // Log content type
    log::info!("Content-Type: {:?}", req.headers().get("content-type"));

    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Check if we're receiving JSON
    if let Some(json_data) = json {
        // Process JSON data
        log::info!("Processing JSON data");

        match user_service::get_user_by_id(&db, &user_id).await {
            Ok(user) => {
                let username = user.username.clone();
                match news_service::create_news(&db, json_data.into_inner(), &user_id, &username)
                    .await
                {
                    Ok(news) => HttpResponse::Created().json(news),
                    Err(e) => {
                        log::error!("Error creating news post from JSON: {:?}", e);
                        e.error_response()
                    }
                }
            }
            Err(e) => {
                log::error!("Error fetching user: {:?}", e);
                e.error_response()
            }
        }
    } else {
        // Multipart handling path
        log::info!("Processing multipart form data");

        // Extract all the fields from the form
        let mut title = None;
        let mut content = None;
        let mut summary = None;
        let mut published = None;
        let mut image_url = None;

        // Create uploads directory if it doesn't exist
        let uploads_dir = Path::new("uploads");
        if !uploads_dir.exists() {
            match tokio::fs::create_dir_all(uploads_dir).await {
                Ok(_) => log::info!("Created uploads directory"),
                Err(e) => {
                    log::error!("Failed to create uploads directory: {:?}", e);
                    return HttpResponse::InternalServerError().json(serde_json::json!({
                        "status": "error",
                        "message": "Failed to create uploads directory"
                    }));
                }
            }
        }

        // Process each field in the multipart form
        while let Ok(Some(mut field)) = payload.try_next().await {
            if let Some(content_disposition) = field.content_disposition() {
                let name = content_disposition.get_name().unwrap_or_default();
                log::info!("Processing field: {}", name);

                match name {
                    "title" => {
                        let mut data = Vec::new();
                        while let Some(chunk) = field.next().await {
                            data.extend_from_slice(&chunk.unwrap_or_default());
                        }
                        let field_value = String::from_utf8_lossy(&data).to_string();
                        log::info!("Title: {}", field_value);
                        title = Some(field_value);
                    }
                    "content" => {
                        let mut data = Vec::new();
                        while let Some(chunk) = field.next().await {
                            data.extend_from_slice(&chunk.unwrap_or_default());
                        }
                        let field_value = String::from_utf8_lossy(&data).to_string();
                        log::info!("Content length: {}", field_value.len());
                        content = Some(field_value);
                    }
                    "summary" => {
                        let mut data = Vec::new();
                        while let Some(chunk) = field.next().await {
                            data.extend_from_slice(&chunk.unwrap_or_default());
                        }
                        let field_value = String::from_utf8_lossy(&data).to_string();
                        log::info!("Summary length: {}", field_value.len());
                        summary = Some(field_value);
                    }
                    "published" => {
                        let mut data = Vec::new();
                        while let Some(chunk) = field.next().await {
                            data.extend_from_slice(&chunk.unwrap_or_default());
                        }
                        let published_str = String::from_utf8_lossy(&data).to_string();
                        log::info!("Published: {}", published_str);
                        published = Some(published_str.to_lowercase() == "true");
                    }
                    "image" => {
                        log::info!("Processing image upload");
                        if let Some(filename) = content_disposition.get_filename() {
                            log::info!("Original filename: {}", filename);
                            let unique_filename = format!("{}-{}", Uuid::new_v4(), filename);
                            log::info!("Saving as: {}", unique_filename);
                            let filepath = uploads_dir.join(&unique_filename);

                            // Open file for writing
                            match tokio::fs::File::create(&filepath).await {
                                Ok(mut file) => {
                                    let mut total_bytes = 0;

                                    // Write each chunk to the file
                                    let mut write_error = false;
                                    while let Some(chunk) = field.next().await {
                                        match chunk {
                                            Ok(data) => {
                                                total_bytes += data.len();
                                                match file.write_all(&data).await {
                                                    Ok(_) => {}
                                                    Err(e) => {
                                                        log::error!(
                                                            "Error writing to file: {:?}",
                                                            e
                                                        );
                                                        write_error = true;
                                                        break;
                                                    }
                                                }
                                            }
                                            Err(e) => {
                                                log::error!(
                                                    "Error getting multipart chunk: {:?}",
                                                    e
                                                );
                                                write_error = true;
                                                break;
                                            }
                                        }
                                    }

                                    if !write_error {
                                        log::info!("Image saved, size: {} bytes", total_bytes);
                                        // Set the image URL to the relative path
                                        image_url = Some(format!("/uploads/{}", unique_filename));
                                    }
                                }
                                Err(e) => {
                                    log::error!("Failed to create file: {:?}", e);
                                    // Skip this field
                                    while let Some(_) = field.next().await {}
                                }
                            }
                        } else {
                            log::warn!("Image field found but no filename provided");
                            // Skip this field
                            while let Some(_) = field.next().await {}
                        }
                    }
                    _ => {
                        // Skip unknown fields
                        log::info!("Skipping unknown field: {}", name);
                        while let Some(_) = field.next().await {}
                    }
                }
            } else {
                log::warn!("Field without content disposition");
                while let Some(_) = field.next().await {}
            }
        }

        log::info!(
            "Form processing complete. Title: {:?}, Content: {:?}, Summary: {:?}",
            title.as_ref().map(|_| "present"),
            content.as_ref().map(|_| "present"),
            summary.as_ref().map(|_| "present")
        );

        // Validate required fields
        if title.is_none() {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": "Title is required"
            }));
        }

        if content.is_none() {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": "Content is required"
            }));
        }

        if summary.is_none() {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": "Summary is required"
            }));
        }

        // Create the DTO
        let news_data = CreateNewsDto {
            title: title.unwrap(),
            content: content.unwrap(),
            summary: summary.unwrap(),
            image_url,
            published,
        };

        // Since username isn't in Claims, fetch it from the database
        match user_service::get_user_by_id(&db, &user_id).await {
            Ok(user) => {
                let username = user.username.clone();
                match news_service::create_news(&db, news_data, &user_id, &username).await {
                    Ok(news) => HttpResponse::Created().json(news),
                    Err(e) => {
                        log::error!("Error creating news post: {:?}", e);
                        e.error_response()
                    }
                }
            }
            Err(e) => {
                log::error!("Error fetching user: {:?}", e);
                e.error_response()
            }
        }
    }
}

/// Update a news post (admin only)
#[utoipa::path(
    put,
    path = "/api/v1/admin/news/{news_id}",
    params(
        ("news_id" = String, Path, description = "News post ID to update")
    ),
    request_body = UpdateNewsDto,
    responses(
        (status = 200, description = "News post updated successfully", body = NewsResponse),
        (status = 400, description = "Invalid input"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "News post not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[put("/api/v1/admin/news/{news_id}")]
async fn update_news(
    db: web::Data<Database>,
    path: web::Path<String>,
    update_data: web::Json<UpdateNewsDto>,
    req: HttpRequest,
) -> impl Responder {
    let news_id = path.into_inner();

    // Get claims from request extensions (set by middleware)
    // Extract user_id before any await points
    let user_id = {
        let extensions = req.extensions();
        let claims = extensions
            .get::<jwt::Claims>()
            .expect("JWT claims not found in request extensions");
        claims.sub.clone()
    };

    // Since username isn't in Claims, fetch it from the database
    match user_service::get_user_by_id(&db, &user_id).await {
        Ok(user) => {
            let username = user.username.clone();
            match news_service::update_news(
                &db,
                &news_id,
                update_data.into_inner(),
                &user_id,
                &username,
            )
            .await
            {
                Ok(news) => HttpResponse::Ok().json(news),
                Err(e) => {
                    log::error!("Error updating news post: {:?}", e);
                    e.error_response()
                }
            }
        }
        Err(e) => {
            log::error!("Error fetching user: {:?}", e);
            e.error_response()
        }
    }
}

/// Delete a news post (admin only)
#[utoipa::path(
    delete,
    path = "/api/v1/admin/news/{news_id}",
    params(
        ("news_id" = String, Path, description = "News post ID to delete")
    ),
    responses(
        (status = 204, description = "News post deleted successfully"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - requires admin role"),
        (status = 404, description = "News post not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "admin"
)]
#[delete("/api/v1/admin/news/{news_id}")]
async fn delete_news(db: web::Data<Database>, path: web::Path<String>) -> impl Responder {
    let news_id = path.into_inner();

    match news_service::delete_news(&db, &news_id).await {
        Ok(()) => HttpResponse::NoContent().finish(),
        Err(e) => {
            log::error!("Error deleting news post: {:?}", e);
            e.error_response()
        }
    }
}

/// Get recent news posts for homepage
#[utoipa::path(
    get,
    path = "/api/v1/news/recent",
    params(
        ("limit" = Option<u64>, Query, description = "Limit the number of results (default: 5)")
    ),
    responses(
        (status = 200, description = "Recent news posts retrieved successfully", body = NewsListResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "news"
)]
#[get("/api/v1/news/recent")]
async fn get_recent_news(
    db: web::Data<Database>,
    query: web::Query<crate::models::common::LimitQuery>,
) -> impl Responder {
    match news_service::get_recent_news(&db, query.limit.unwrap_or(5)).await {
        Ok(news) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "data": {
                "news": news
            }
        })),
        Err(e) => {
            log::error!("Error fetching recent news: {:?}", e);
            e.error_response()
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring news routes");
    cfg.service(get_all_news);
    cfg.service(get_news_by_id);
    cfg.service(create_news);
    cfg.service(update_news);
    cfg.service(delete_news);
    cfg.service(get_recent_news);
}
