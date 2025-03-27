use crate::models::error::AppError;
use crate::models::game_data::{
    CovenantResponse, GameDataResponse, NightfarerResponse, PlatformResponse, RegionResponse,
};
use crate::repository::game_data_repository;
use mongodb::Database;

/// Get all game data including platforms, regions, covenants, and nightfarers
pub async fn get_all_game_data(db: &Database) -> Result<GameDataResponse, AppError> {
    // Fetch all data concurrently for better performance
    let platforms_future = game_data_repository::get_all_platforms(db);
    let regions_future = game_data_repository::get_all_regions(db);
    let covenants_future = game_data_repository::get_all_covenants(db);
    let nightfarers_future = game_data_repository::get_all_nightfarers(db);

    // Using futures::join! to run futures concurrently
    let (platforms, regions, covenants, nightfarers) = futures::try_join!(
        platforms_future,
        regions_future,
        covenants_future,
        nightfarers_future
    )?;

    // Convert database models to response DTOs
    let platform_responses: Vec<PlatformResponse> =
        platforms.into_iter().map(PlatformResponse::from).collect();

    let region_responses: Vec<RegionResponse> =
        regions.into_iter().map(RegionResponse::from).collect();

    let covenant_responses: Vec<CovenantResponse> =
        covenants.into_iter().map(CovenantResponse::from).collect();

    let nightfarer_responses: Vec<NightfarerResponse> = nightfarers
        .into_iter()
        .map(NightfarerResponse::from)
        .collect();

    // Construct and return the combined response
    Ok(GameDataResponse {
        platforms: platform_responses,
        regions: region_responses,
        covenants: covenant_responses,
        nightfarers: nightfarer_responses,
    })
}

/// Get all platforms
pub async fn get_all_platforms(db: &Database) -> Result<Vec<PlatformResponse>, AppError> {
    let platforms = game_data_repository::get_all_platforms(db).await?;
    let platform_responses = platforms.into_iter().map(PlatformResponse::from).collect();
    Ok(platform_responses)
}

/// Get all regions
pub async fn get_all_regions(db: &Database) -> Result<Vec<RegionResponse>, AppError> {
    let regions = game_data_repository::get_all_regions(db).await?;
    let region_responses = regions.into_iter().map(RegionResponse::from).collect();
    Ok(region_responses)
}

/// Get all covenants
pub async fn get_all_covenants(db: &Database) -> Result<Vec<CovenantResponse>, AppError> {
    let covenants = game_data_repository::get_all_covenants(db).await?;
    let covenant_responses = covenants.into_iter().map(CovenantResponse::from).collect();
    Ok(covenant_responses)
}

/// Get all nightfarers
pub async fn get_all_nightfarers(db: &Database) -> Result<Vec<NightfarerResponse>, AppError> {
    let nightfarers = game_data_repository::get_all_nightfarers(db).await?;
    let nightfarer_responses = nightfarers
        .into_iter()
        .map(NightfarerResponse::from)
        .collect();
    Ok(nightfarer_responses)
}
