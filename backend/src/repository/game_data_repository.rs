use crate::models::error::AppError;
use crate::models::game_data::{Covenant, Nightfarer, NightLord, Platform, Region};
use futures::StreamExt;
use log::error;
use mongodb::{bson::doc, Collection, Database};

// Collection names
const PLATFORMS_COLLECTION: &str = "platforms";
const REGIONS_COLLECTION: &str = "regions";
const COVENANTS_COLLECTION: &str = "covenants";
const NIGHTFARERS_COLLECTION: &str = "nightfarers";
const NIGHTLORDS_COLLECTION: &str = "nightlords";

// Helper functions to get collections
fn get_platforms_collection(db: &Database) -> Collection<Platform> {
    db.collection::<Platform>(PLATFORMS_COLLECTION)
}

fn get_regions_collection(db: &Database) -> Collection<Region> {
    db.collection::<Region>(REGIONS_COLLECTION)
}

fn get_covenants_collection(db: &Database) -> Collection<Covenant> {
    db.collection::<Covenant>(COVENANTS_COLLECTION)
}

fn get_nightfarers_collection(db: &Database) -> Collection<Nightfarer> {
    db.collection::<Nightfarer>(NIGHTFARERS_COLLECTION)
}

fn get_nightlords_collection(db: &Database) -> Collection<NightLord> {
    db.collection::<NightLord>(NIGHTLORDS_COLLECTION)
}

// Platform repository functions
pub async fn get_all_platforms(db: &Database) -> Result<Vec<Platform>, AppError> {
    let collection = get_platforms_collection(db);

    // Create an empty filter to get all documents
    let filter = doc! {};

    // Execute the find operation
    let cursor_result = collection.find(filter).await;

    // Handle any errors from the find operation
    let mut cursor = cursor_result.map_err(|e| {
        error!("Database error fetching platforms: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect results
    let mut platforms = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(platform) => platforms.push(platform),
            Err(e) => {
                error!("Error parsing platform document: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    Ok(platforms)
}

// Region repository functions
pub async fn get_all_regions(db: &Database) -> Result<Vec<Region>, AppError> {
    let collection = get_regions_collection(db);

    // Create an empty filter to get all documents
    let filter = doc! {};

    // Execute the find operation
    let cursor_result = collection.find(filter).await;

    // Handle any errors from the find operation
    let mut cursor = cursor_result.map_err(|e| {
        error!("Database error fetching regions: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect results
    let mut regions = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(region) => regions.push(region),
            Err(e) => {
                error!("Error parsing region document: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    Ok(regions)
}

// Covenant repository functions
pub async fn get_all_covenants(db: &Database) -> Result<Vec<Covenant>, AppError> {
    let collection = get_covenants_collection(db);

    // Create an empty filter to get all documents
    let filter = doc! {};

    // Execute the find operation
    let cursor_result = collection.find(filter).await;

    // Handle any errors from the find operation
    let mut cursor = cursor_result.map_err(|e| {
        error!("Database error fetching covenants: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect results
    let mut covenants = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(covenant) => covenants.push(covenant),
            Err(e) => {
                error!("Error parsing covenant document: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    Ok(covenants)
}

// Nightfarer repository functions
pub async fn get_all_nightfarers(db: &Database) -> Result<Vec<Nightfarer>, AppError> {
    let collection = get_nightfarers_collection(db);

    // Create an empty filter to get all documents
    let filter = doc! {};

    // Execute the find operation
    let cursor_result = collection.find(filter).await;

    // Handle any errors from the find operation
    let mut cursor = cursor_result.map_err(|e| {
        error!("Database error fetching nightfarers: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect results
    let mut nightfarers = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(nightfarer) => nightfarers.push(nightfarer),
            Err(e) => {
                error!("Error parsing nightfarer document: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    Ok(nightfarers)
}

// NightLord repository functions
pub async fn get_all_nightlords(db: &Database) -> Result<Vec<NightLord>, AppError> {
    let collection = get_nightlords_collection(db);

    // Create an empty filter to get all documents
    let filter = doc! {};

    // Execute the find operation
    let cursor_result = collection.find(filter).await;

    // Handle any errors from the find operation
    let mut cursor = cursor_result.map_err(|e| {
        error!("Database error fetching night lords: {:?}", e);
        AppError::DatabaseError(e)
    })?;

    // Collect results
    let mut nightlords = Vec::new();
    while let Some(result) = cursor.next().await {
        match result {
            Ok(nightlord) => nightlords.push(nightlord),
            Err(e) => {
                error!("Error parsing night lord document: {:?}", e);
                return Err(AppError::DatabaseError(e));
            }
        }
    }

    Ok(nightlords)
}
