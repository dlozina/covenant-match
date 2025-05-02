use actix_web::{delete, get, post, put, web, HttpRequest, HttpResponse, Responder};
use serde_json::json;

use crate::models::bug::CreateBugReportDto;
use crate::models::error::AppError;
use crate::services::bug_service;
use crate::utils::request::{get_claims, is_admin};
use mongodb::Database;

/// Create a new bug report
///
/// Returns the ID of the created bug report
#[utoipa::path(
    post,
    path = "/api/v1/bugs",
    request_body = CreateBugReportDto,
    responses(
        (status = 201, description = "Bug report created successfully", body = CreateBugReportResponse),
        (status = 400, description = "Validation error", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[post("/api/v1/bugs")]
async fn create_bug_report(
    db: web::Data<Database>,
    dto: web::Json<CreateBugReportDto>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    let Some(claims) = get_claims(&req) else {
        return Err(AppError::AuthenticationRequired);
    };

    let user_id = claims.sub;

    let id = bug_service::create_bug_report(&db, dto.into_inner(), user_id).await?;

    Ok(HttpResponse::Created().json(json!({
        "status": "success",
        "data": {
            "id": id
        }
    })))
}

/// Get all bug reports with pagination
///
/// Returns a paginated list of all bug reports - Admin only
#[utoipa::path(
    get,
    path = "/api/v1/bugs",
    params(
        ("page" = Option<u64>, Query, description = "Page number, starting from 1 (default: 1)"),
        ("limit" = Option<u64>, Query, description = "Number of items per page (default: 10)"),
        ("search" = Option<String>, Query, description = "Search term for filtering bug reports")
    ),
    responses(
        (status = 200, description = "List of bug reports", body = BugReportsListResponse),
        (status = 403, description = "Forbidden - Admin access required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[get("/api/v1/bugs")]
async fn get_all_bug_reports(
    db: web::Data<Database>,
    req: HttpRequest,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, AppError> {
    // Check if the user is an admin
    if !is_admin(&req) {
        return Err(AppError::Forbidden("Admin role required".to_string()));
    }

    // Extract pagination parameters
    let page = query
        .get("page")
        .and_then(|p| p.parse::<u64>().ok())
        .unwrap_or(1);

    let limit = query
        .get("limit")
        .and_then(|l| l.parse::<u64>().ok())
        .unwrap_or(10);

    let search = query.get("search").cloned();

    let (reports, total, total_pages) =
        bug_service::get_all_bug_reports_paginated(&db, page, limit, search).await?;

    Ok(HttpResponse::Ok().json(json!({
        "status": "success",
        "data": {
            "bugs": reports,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages
            }
        }
    })))
}

/// Get a bug report by ID
///
/// Returns a single bug report by its ID - Admin only
#[utoipa::path(
    get,
    path = "/api/v1/bugs/{id}",
    params(
        ("id" = String, Path, description = "Bug report ID")
    ),
    responses(
        (status = 200, description = "Bug report found", body = BugReportResponse),
        (status = 403, description = "Forbidden - Admin access required", body = ErrorResponse),
        (status = 404, description = "Bug report not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    )
)]
#[get("/api/v1/bugs/{id}")]
async fn get_bug_report_by_id(
    db: web::Data<Database>,
    path: web::Path<String>,
    req: HttpRequest,
) -> Result<HttpResponse, AppError> {
    // Check if the user is an admin
    if !is_admin(&req) {
        return Err(AppError::Forbidden("Admin role required".to_string()));
    }

    let id = path.into_inner();
    let report = bug_service::get_bug_report_by_id(&db, &id).await?;

    Ok(HttpResponse::Ok().json(json!({
        "status": "success",
        "data": {
            "bug": report
        }
    })))
}

/// Configure routes for bug reports
pub fn config(cfg: &mut web::ServiceConfig) {
    log::info!("Configuring bug routes");
    cfg.service(create_bug_report);
    cfg.service(get_all_bug_reports);
    cfg.service(get_bug_report_by_id);
}
