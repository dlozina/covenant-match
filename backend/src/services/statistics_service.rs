use mongodb::Database;
use crate::models::statistics::{UserStatistics, LeaderboardEntry};
use crate::models::error::AppError;
use crate::repository::statistics_repository;

pub async fn get_user_statistics(db: &Database, user_id: &str) -> Result<Option<UserStatistics>, AppError> {
    statistics_repository::find_by_user_id(db, user_id).await
}

pub async fn get_leaderboard(db: &Database, limit: i64) -> Result<Vec<LeaderboardEntry>, AppError> {
    statistics_repository::get_leaderboard(db, limit).await
}
