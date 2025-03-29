use crate::models::error::AppError;
use crate::models::statistics::{LeaderboardEntry, UserStatistics};
use crate::repository::statistics_repository;
use mongodb::Database;

pub async fn get_user_statistics(
    db: &Database,
    user_id: &str,
) -> Result<Option<UserStatistics>, AppError> {
    statistics_repository::find_by_user_id(db, user_id).await
}

pub async fn get_all_user_statistics(db: &Database) -> Result<Vec<UserStatistics>, AppError> {
    statistics_repository::find_all(db).await
}

pub async fn get_leaderboard(db: &Database, limit: i64) -> Result<Vec<LeaderboardEntry>, AppError> {
    statistics_repository::get_leaderboard(db, limit).await
}
