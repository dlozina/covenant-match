use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct CreatePaymentIntentDto {
    pub amount: i64,
    pub currency: String,
    #[serde(default)]
    pub display_name: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct PaymentResponse {
    pub session_id: String,
}

#[derive(Serialize, ToSchema)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Deserialize, ToSchema)]
pub struct SessionRequestDto {
    pub session_id: String,
}

#[derive(Serialize, ToSchema)]
pub struct SessionResponse {
    pub status: String,
    pub payment_status: String,
    pub amount_total: Option<i64>,
    pub currency: Option<String>,
    pub customer_email: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Donor {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub email: String,
    pub display_name: Option<String>,
    pub amount: i64,
    pub currency: String,
    pub payment_status: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct DonorResponse {
    pub id: String,
    pub display_name: String,
    pub payment_status: String,
    pub created_at: DateTime,
}

impl From<Donor> for DonorResponse {
    fn from(donor: Donor) -> Self {
        let email = donor.email.clone();
        DonorResponse {
            id: donor.id.unwrap_or_default().to_hex(),
            display_name: donor.display_name.unwrap_or_else(|| {
                // Extract first name from email or use "Anonymous Donor"
                email
                    .split('@')
                    .next()
                    .map_or_else(
                        || "Anonymous Donor".to_string(),
                        |name| {
                            let mut chars = name.chars();
                            match chars.next() {
                                None => "Anonymous Donor".to_string(),
                                Some(c) => format!("{}{}", c.to_uppercase(), chars.collect::<String>()),
                            }
                        }
                    )
            }),
            payment_status: donor.payment_status,
            created_at: donor.created_at,
        }
    }
}

#[derive(Deserialize, ToSchema)]
pub struct DonorQueryParams {
    #[serde(default = "default_page")]
    pub page: u64,
    #[serde(default = "default_limit")]
    pub limit: u64,
}

fn default_page() -> u64 {
    1
}

fn default_limit() -> u64 {
    10
}

#[derive(Serialize, ToSchema)]
pub struct DonorsResponse {
    pub donors: Vec<DonorResponse>,
    pub total: u64,
    pub page: u64,
}
