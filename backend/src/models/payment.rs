use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct CreatePaymentIntentDto {
    pub amount: i64,
    pub currency: String,
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


