use mongodb::{Database, bson::{doc, Document}, Collection, options::FindOptions};
use crate::models::statistics::{UserStatistics, CharacterStats, LeaderboardEntry};
use crate::models::session::GameResult;
use crate::models::error::AppError;
use futures::TryStreamExt;
use std::collections::HashMap;

fn get_collection(db: &Database) -> Collection<UserStatistics> {
    db.collection::<UserStatistics>("statistics")
}

pub async fn find_by_user_id(db: &Database, user_id: &str) -> Result<Option<UserStatistics>, AppError> {
    let stats = get_collection(db)
        .find_one(doc! { "user_id": user_id }, None)
        .await?;
    Ok(stats)
}

pub async fn update_player_stats(
    db: &Database,
    user_id: &str,
    username: &str,
    character: &str,
    result: &GameResult,
) -> Result<(), AppError> {
    // Get existing stats or create new ones
    let mut stats = match find_by_user_id(db, user_id).await? {
        Some(s) => s,
        None => {
            // Create new stats record for user
            UserStatistics {
                id: uuid::Uuid::new_v4().to_string(),
                user_id: user_id.to_string(),
                username: username.to_string(),
                total_games: 0,
                wins: 0,
                losses: 0,
                disconnects: 0,
                win_rate: 0.0,
                character_stats: HashMap::new(),
                achievements: vec![],
                reputation_score: 0.0,
            }
        },
    };
    
    // Update overall stats
    stats.total_games += 1;
    
    match result {
        GameResult::Win => stats.wins += 1,
        GameResult::Loss => stats.losses += 1,
        GameResult::Disconnect => stats.disconnects += 1,
    }
    
    // Calculate win rate
    if stats.total_games > 0 {
        stats.win_rate = (stats.wins as f64 / stats.total_games as f64) * 100.0;
    }
    
    // Update character stats
    let character_stats = stats.character_stats.entry(character.to_string())
        .or_insert_with(|| CharacterStats {
            played: 0,
            wins: 0,
            losses: 0,
            disconnects: 0,
            win_rate: 0.0,
        });
    
    character_stats.played += 1;
    
    match result {
        GameResult::Win => character_stats.wins += 1,
        GameResult::Loss => character_stats.losses += 1,
        GameResult::Disconnect => character_stats.disconnects += 1,
    }
    
    // Calculate character win rate
    if character_stats.played > 0 {
        character_stats.win_rate = (character_stats.wins as f64 / character_stats.played as f64) * 100.0;
    }
    
    // Update or insert the stats document
    get_collection(db)
        .replace_one(
            doc! { "user_id": user_id },
            &stats,
            mongodb::options::ReplaceOptions::builder()
                .upsert(true)
                .build(),
        )
        .await?;
    
    Ok(())
}

pub async fn get_leaderboard(db: &Database, limit: i64) -> Result<Vec<LeaderboardEntry>, AppError> {
    let options = FindOptions::builder()
        .sort(doc! { "win_rate": -1, "total_games": -1 })
        .limit(limit)
        .build();
    
    let cursor = get_collection(db).find(doc! {}, options).await?;
    let stats: Vec<UserStatistics> = cursor.try_collect().await?;
    
    let leaderboard = stats.into_iter()
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
