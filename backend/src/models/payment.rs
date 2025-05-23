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


