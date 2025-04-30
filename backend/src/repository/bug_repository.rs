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

    let cursor = collection.find(doc! {}).await.map_err(|e| {
        error!("Database error finding all bug reports: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    let bugs = cursor.try_collect().await.map_err(|e| {
        error!("Database error collecting bug reports: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    Ok(bugs)
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
