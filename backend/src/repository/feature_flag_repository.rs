use crate::models::admin::FeatureFlag;
use crate::models::error::AppError;
use futures_util::TryStreamExt;
use log::{debug, error};
use mongodb::{bson::doc, Database};

const COLLECTION_NAME: &str = "feature_flags";

/// Find a feature flag by its key
pub async fn find_by_key(db: &Database, key: &str) -> Result<Option<FeatureFlag>, AppError> {
    let collection = db.collection::<FeatureFlag>(COLLECTION_NAME);

    let filter = doc! {
        "key": key
    };

    match collection.find_one(filter).await {
        Ok(flag) => Ok(flag),
        Err(e) => {
            error!("Error finding feature flag by key '{}': {:?}", key, e);
            Err(AppError::InternalError(format!(
                "Error finding feature flag: {}",
                e
            )))
        }
    }
}

/// Find all feature flags in the database
pub async fn find_all(db: &Database) -> Result<Vec<FeatureFlag>, AppError> {
    debug!("Starting to fetch all feature flags");
    let collection = db.collection::<FeatureFlag>(COLLECTION_NAME);

    // Create an empty vector as fallback
    let mut flags: Vec<FeatureFlag> = Vec::new();

    // Use a timeout for the MongoDB operation
    let find_future = async {
        // Get all documents
        debug!("Executing find query for feature flags");
        let cursor = match collection.find(doc! {}).await {
            Ok(cursor) => {
                debug!("Successfully obtained cursor for feature flags");
                cursor
            }
            Err(e) => {
                error!("Error finding feature flags: {:?}", e);
                return Err(AppError::InternalError(format!(
                    "Error finding feature flags: {}",
                    e
                )));
            }
        };

        // Collect results
        debug!("Attempting to collect feature flags from cursor");
        match cursor.try_collect::<Vec<FeatureFlag>>().await {
            Ok(result_flags) => {
                debug!(
                    "Successfully collected {} feature flags",
                    result_flags.len()
                );
                Ok(result_flags)
            }
            Err(e) => {
                error!("Error collecting feature flags: {:?}", e);
                Err(AppError::InternalError(format!(
                    "Error collecting feature flags: {}",
                    e
                )))
            }
        }
    };

    // Execute the future with error handling
    match find_future.await {
        Ok(result_flags) => {
            flags = result_flags;
        }
        Err(e) => {
            error!("Failed to get feature flags: {:?}", e);
            // Return the error but don't fail completely - frontend will show empty list
            return Err(e);
        }
    }

    // Sort by key (since we can't use the options directly in find)
    debug!("Sorting feature flags by key");
    flags.sort_by(|a, b| a.key.cmp(&b.key));
    debug!("Returning {} sorted feature flags", flags.len());

    Ok(flags)
}

/// Create a new feature flag
pub async fn create(db: &Database, flag: &mut FeatureFlag) -> Result<FeatureFlag, AppError> {
    let collection = db.collection::<FeatureFlag>(COLLECTION_NAME);

    // Check if flag with same key already exists
    let existing = find_by_key(db, &flag.key).await?;
    if existing.is_some() {
        return Err(AppError::InternalError(format!(
            "Feature flag with key '{}' already exists",
            flag.key
        )));
    }

    // Set timestamps
    let now = mongodb::bson::DateTime::now();
    flag.created_at = Some(now);
    flag.updated_at = Some(now);

    // Insert the document
    match collection.insert_one(flag.clone()).await {
        Ok(result) => {
            flag.id = result.inserted_id.as_object_id();
            debug!("Created feature flag: {}", flag.key);
            Ok(flag.clone())
        }
        Err(e) => {
            error!("Error creating feature flag: {:?}", e);
            Err(AppError::InternalError(format!(
                "Error creating feature flag: {}",
                e
            )))
        }
    }
}

/// Update an existing feature flag
pub async fn update(db: &Database, key: &str, flag: &FeatureFlag) -> Result<FeatureFlag, AppError> {
    let collection = db.collection::<FeatureFlag>(COLLECTION_NAME);

    // Check if flag exists
    let existing = find_by_key(db, key).await?;
    if existing.is_none() {
        return Err(AppError::InternalError(format!(
            "Feature flag with key '{}' not found",
            key
        )));
    }

    // Create update document
    let now = mongodb::bson::DateTime::now();
    let update = doc! {
        "$set": {
            "name": &flag.name,
            "description": &flag.description,
            "enabled": flag.enabled,
            "default_value": flag.default_value,
            "updated_at": now
        }
    };

    // Update the document
    match collection.update_one(doc! { "key": key }, update).await {
        Ok(_) => {
            debug!("Updated feature flag: {}", key);

            // Return updated flag
            let mut updated_flag = flag.clone();
            updated_flag.updated_at = Some(now);

            Ok(updated_flag)
        }
        Err(e) => {
            error!("Error updating feature flag: {:?}", e);
            Err(AppError::InternalError(format!(
                "Error updating feature flag: {}",
                e
            )))
        }
    }
}

/// Delete a feature flag
pub async fn delete(db: &Database, key: &str) -> Result<bool, AppError> {
    let collection = db.collection::<FeatureFlag>(COLLECTION_NAME);

    // Check if flag exists
    let existing = find_by_key(db, key).await?;
    if existing.is_none() {
        return Err(AppError::InternalError(format!(
            "Feature flag with key '{}' not found",
            key
        )));
    }

    // Delete the document
    match collection.delete_one(doc! { "key": key }).await {
        Ok(result) => {
            if result.deleted_count == 0 {
                debug!("No feature flag was deleted for key: {}", key);
                Ok(false)
            } else {
                debug!("Deleted feature flag: {}", key);
                Ok(true)
            }
        }
        Err(e) => {
            error!("Error deleting feature flag: {:?}", e);
            Err(AppError::InternalError(format!(
                "Error deleting feature flag: {}",
                e
            )))
        }
    }
}

/// Update a feature flag with partial data
pub async fn update_partial(
    db: &Database,
    key: &str,
    patch: &crate::models::admin::PatchFeatureFlagDto,
) -> Result<FeatureFlag, AppError> {
    let collection = db.collection::<FeatureFlag>(COLLECTION_NAME);

    // Check if flag exists
    let existing = find_by_key(db, key).await?;
    if existing.is_none() {
        return Err(AppError::InternalError(format!(
            "Feature flag with key '{}' not found",
            key
        )));
    }

    let existing = existing.unwrap();

    // Create update document with only the fields that are provided
    let now = mongodb::bson::DateTime::now();
    let mut update_doc = doc! {
        "updated_at": now
    };

    if let Some(name) = &patch.name {
        update_doc.insert("name", name);
    }

    if let Some(description) = &patch.description {
        update_doc.insert("description", description);
    }

    if let Some(enabled) = patch.enabled {
        update_doc.insert("enabled", enabled);
    }

    if let Some(default_value) = patch.default_value {
        update_doc.insert("default_value", default_value);
    }

    let update = doc! {
        "$set": update_doc
    };

    // Update the document
    match collection.update_one(doc! { "key": key }, update).await {
        Ok(_) => {
            debug!("Updated feature flag: {}", key);

            // Get the updated flag
            let updated = find_by_key(db, key).await?.ok_or_else(|| {
                AppError::InternalError(format!(
                    "Feature flag with key '{}' disappeared after update",
                    key
                ))
            })?;

            Ok(updated)
        }
        Err(e) => {
            error!("Error updating feature flag: {:?}", e);
            Err(AppError::InternalError(format!(
                "Error updating feature flag: {}",
                e
            )))
        }
    }
}
