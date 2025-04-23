use crate::models::error::AppError;
use crate::models::news::{CreateNewsDto, NewsResponse, UpdateNewsDto};
use crate::services::news_service;
use crate::services::user_service;
use actix_web::{
    delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder, ResponseError,
};
use mongodb::Database;

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
    news_data: web::Json<CreateNewsDto>,
    req: HttpRequest,
) -> impl Responder {
    // Extract user_id from request extensions for author tracking
    let extensions = req.extensions();
    let claims = extensions
        .get::<crate::utils::jwt::Claims>()
        .expect("JWT claims not found in request extensions");
    let user_id = claims.sub.clone();

    // Since username isn't in Claims, fetch it from the database
    match user_service::get_user_by_id(&db, &user_id).await {
        Ok(user) => {
            let username = user.username.clone();
            match news_service::create_news(&db, news_data.into_inner(), &user_id, &username).await
            {
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

    // Extract user_id from request extensions for updated_by tracking
    let extensions = req.extensions();
    let claims = extensions
        .get::<crate::utils::jwt::Claims>()
        .expect("JWT claims not found in request extensions");
    let user_id = claims.sub.clone();

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
