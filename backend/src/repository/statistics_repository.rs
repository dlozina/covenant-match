use crate::models::error::AppError;
use crate::models::session::GameResult;
use crate::models::statistics::{LeaderboardEntry, Stats, UserStatistics};
use futures::TryStreamExt;
use mongodb::{bson::doc, Collection, Database};
use std::collections::HashMap;

fn get_collection(db: &Database) -> Collection<UserStatistics> {
    db.collection::<UserStatistics>("statistics")
}

// Helper function to create new user statistics
fn create_new_statistics(user_id: &str, username: &str) -> UserStatistics {
    UserStatistics {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user_id.to_string(),
        username: username.to_string(),
        total_games: 0,
        wins: 0,
        losses: 0,
        disconnects: 0,
        win_rate: 0.0,
        nightfarer_stats: HashMap::new(),
        night_lord_stats: HashMap::new(),
        covenant_stats: HashMap::new(),
        achievements: vec![],
        reputation_score: 0.0,
    }
}

// Helper function to update overall statistics
fn update_overall_stats(stats: &mut UserStatistics, result: GameResult) {
    stats.total_games += 1;

    match result {
        GameResult::Win => stats.wins += 1,
        GameResult::Loss => stats.losses += 1,
        GameResult::Disconnect => stats.disconnects += 1,
    }

    // Calculate win rate
    if stats.total_games > 0 {
        stats.win_rate =
            ((stats.wins as f64 / stats.total_games as f64) * 100.0 * 100.0).round() / 100.0;
    }
}

// Helper function to update specific stats for a character/night lord/covenant
fn update_specific_stats(stats_map: &mut HashMap<String, Stats>, name: &str, result: GameResult) {
    let specific_stats = stats_map.entry(name.to_string()).or_insert_with(|| Stats {
        played: 0,
        wins: 0,
        losses: 0,
        disconnects: 0,
        win_rate: 0.0,
    });

    specific_stats.played += 1;

    match result {
        GameResult::Win => specific_stats.wins += 1,
        GameResult::Loss => specific_stats.losses += 1,
        GameResult::Disconnect => specific_stats.disconnects += 1,
    }

    // Calculate win rate
    if specific_stats.played > 0 {
        specific_stats.win_rate =
            ((specific_stats.wins as f64 / specific_stats.played as f64) * 100.0 * 100.0).round()
                / 100.0;
    }
}

pub async fn find_by_user_id(
    db: &Database,
    user_id: &str,
) -> Result<Option<UserStatistics>, AppError> {
    let stats = get_collection(db)
        .find_one(doc! { "user_id": user_id })
        .await?;
    Ok(stats)
}

pub async fn find_all(db: &Database) -> Result<Vec<UserStatistics>, AppError> {
    let cursor = get_collection(db).find(doc! {}).await?;
    let stats = cursor.try_collect().await?;
    Ok(stats)
}

pub async fn update_player_stats(
    db: &Database,
    user_id: &str,
    username: &str,
    nightfarer: &str,
    night_lord: &str,
    covenant_name: &str,
    result: GameResult,
) -> Result<(), AppError> {
    // Get existing stats or create new ones
    let mut stats = match find_by_user_id(db, user_id).await? {
        Some(s) => s,
        None => create_new_statistics(user_id, username),
    };

    // Update changed username -> Display Name
    if stats.username != username {
        stats.username = username.to_string();
    }

    // Update overall stats
    update_overall_stats(&mut stats, result);

    // Update stats for specific types
    update_specific_stats(&mut stats.nightfarer_stats, nightfarer, result);
    update_specific_stats(&mut stats.night_lord_stats, night_lord, result);
    update_specific_stats(&mut stats.covenant_stats, covenant_name, result);

    // Update or insert the stats document
    get_collection(db)
        .replace_one(doc! { "user_id": user_id }, &stats)
        .upsert(true)
        .await?;

    Ok(())
}

pub async fn get_leaderboard(db: &Database, limit: i64) -> Result<Vec<LeaderboardEntry>, AppError> {
    // Get all statistics
    let cursor = get_collection(db).find(doc! {}).await?;
    let mut stats: Vec<UserStatistics> = cursor.try_collect().await?;

    // Manually sort by win_rate and total_games
    stats.sort_by(|a, b| {
        b.win_rate
            .partial_cmp(&a.win_rate)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.total_games.cmp(&a.total_games))
    });

    // Apply limit
    if stats.len() > limit as usize {
        stats.truncate(limit as usize);
    }

    let leaderboard = stats
        .into_iter()
        .map(|s| LeaderboardEntry {
            user_id: s.user_id,
            username: s.username,
            total_games: s.total_games,
            wins: s.wins,
            win_rate: s.win_rate,
            reputation_score: s.reputation_score,
        })
        .collect();

    Ok(leaderboard)
}
