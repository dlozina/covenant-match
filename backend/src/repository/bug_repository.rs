use crate::models::bug::BugReport;
use crate::models::error::AppError;
use futures::TryStreamExt;
use log::error;
use mongodb::{
    bson::{doc, oid::ObjectId},
    Collection, Database,
};

const COLLECTION_NAME: &str = "bugs";

fn get_collection(db: &Database) -> Collection<BugReport> {
    db.collection::<BugReport>(COLLECTION_NAME)
}

/// Create a new bug report
pub async fn create_bug_report(db: &Database, bug: &BugReport) -> Result<String, AppError> {
    let collection = get_collection(db);

    let result = collection.insert_one(bug).await.map_err(|e| {
        error!("Database error creating bug report: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Extract the created document ID
    let id = result
        .inserted_id
        .as_object_id()
        .ok_or_else(|| {
            error!("Failed to extract ObjectId from inserted document");
            AppError::DatabaseError(mongodb::error::Error::custom("Failed to extract ObjectId"))
        })?
        .to_hex();

    Ok(id)
}

/// Get all bug reports
pub async fn get_all_bug_reports(db: &Database) -> Result<Vec<BugReport>, AppError> {
    let collection = get_collection(db);
    let filter = doc! {};

    let cursor = collection.find(filter).await.map_err(|e| {
        error!("Database error finding all bug reports: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    let bugs = cursor.try_collect().await.map_err(|e| {
        error!("Database error collecting bug reports: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(bugs)
}

/// Get bug reports with pagination and search capability
pub async fn get_bug_reports_paginated(
    db: &Database,
    page: u64,
    limit: u64,
    search: Option<String>,
) -> Result<(Vec<BugReport>, u64), AppError> {
    let collection = get_collection(db);

    // Create filter based on search term
    let filter = match search {
        Some(search_term) if !search_term.is_empty() => {
            // Create case-insensitive regex for search
            let regex_pattern = format!(".*{}.*", regex_escape(&search_term));

            // Search across multiple fields
            doc! {
                "$or": [
                    { "title": { "$regex": regex_pattern.clone(), "$options": "i" } },
                    { "description": { "$regex": regex_pattern.clone(), "$options": "i" } },
                    { "device": { "$regex": regex_pattern.clone(), "$options": "i" } },
                    { "user_name": { "$regex": regex_pattern, "$options": "i" } }
                ]
            }
        }
        _ => doc! {},
    };

    // Get total count for pagination (do this first before applying limits)
    let total = collection
        .count_documents(filter.clone())
        .await
        .map_err(|e| {
            error!("Database error counting bug reports: {:?}", e);
            AppError::DatabaseError(e)
        })?;

    // Get the cursor for the query
    let cursor = collection.find(filter).await.map_err(|e| {
        error!("Database error finding paginated bug reports: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect all results
    let mut all_bugs: Vec<BugReport> = cursor.try_collect().await.map_err(|e| {
        error!("Database error collecting bug reports: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Sort by created_at in descending order (most recent first)
    all_bugs.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Apply pagination manually
    let start = (page - 1) * limit;
    let end = std::cmp::min(start + limit, all_bugs.len() as u64);

    let paged_bugs = if start < all_bugs.len() as u64 {
        all_bugs[start as usize..end as usize].to_vec()
    } else {
        Vec::new()
    };

    Ok((paged_bugs, total))
}

/// Helper function to escape regex special characters
fn regex_escape(s: &str) -> String {
    let special_chars = [
        "\\", ".", "+", "*", "?", "(", ")", "[", "]", "{", "}", "^", "$", "|",
    ];

    let mut result = s.to_string();
    for ch in special_chars {
        result = result.replace(ch, &format!("\\{}", ch));
    }
    result
}

/// Get a bug report by ID
pub async fn get_bug_report_by_id(db: &Database, id: &str) -> Result<Option<BugReport>, AppError> {
    // Convert string ID to ObjectId
    let object_id = ObjectId::parse_str(id).map_err(|e| {
        error!("Invalid ObjectId format: {:?}", e);
        AppError::InvalidId
    })?;

    let filter = doc! { "_id": object_id };

    let bug = get_collection(db).find_one(filter).await.map_err(|e| {
        error!("Database error finding bug report by id: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(bug)
}

/// Get all bug reports submitted by a specific user
pub async fn get_bug_reports_by_user_id(
    db: &Database,
    user_id: &str,
) -> Result<Vec<BugReport>, AppError> {
    let collection = get_collection(db);

    let filter = doc! { "user_id": user_id };

    let cursor = collection.find(filter).await.map_err(|e| {
        error!("Database error finding bug reports by user id: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    let bugs = cursor.try_collect().await.map_err(|e| {
        error!("Database error collecting bug reports by user id: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(bugs)
}
