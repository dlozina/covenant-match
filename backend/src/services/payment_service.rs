use crate::models::error::AppError;
use crate::models::payment::{Donor, DonorResponse};
use crate::repository::payment_repository;
use mongodb::{bson::DateTime, Database};

pub async fn create_donor(
    db: &Database,
    email: String,
    amount: i64,
    currency: String,
    payment_status: String,
    display_name: Option<String>,
) -> Result<DonorResponse, AppError> {
    let now = DateTime::now();
    let donor = Donor {
        id: None,
        email,
        display_name,
        amount,
        currency,
        payment_status,
        created_at: now,
        updated_at: now,
    };

    let created_donor = payment_repository::create_donor(db, &donor).await?;
    Ok(DonorResponse::from(created_donor))
}

pub async fn get_donors_paginated(
    db: &Database,
    page: u64,
    limit: u64,
) -> Result<(Vec<DonorResponse>, u64, u64), AppError> {
    // Ensure page and limit are valid
    let page = if page < 1 { 1 } else { page };
    let limit = if limit < 1 { 10 } else { limit };

    // Get paginated donors with total count
    let (donors, total) = payment_repository::find_donors_paginated(db, page, limit).await?;

    // Convert to DonorResponse objects
    let donor_responses = donors.into_iter().map(DonorResponse::from).collect();

    Ok((donor_responses, total, page))
}
