use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct CreatePaymentIntentDto {
    pub amount: i64,
    pub currency: String,
}

#[derive(Serialize)]
pub struct PaymentResponse {
    pub session_id: String,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}


