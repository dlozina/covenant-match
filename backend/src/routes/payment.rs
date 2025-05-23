use crate::models::payment::CreatePaymentIntentDto;
use crate::models::payment::ErrorResponse;
use crate::models::payment::PaymentResponse;
use crate::models::payment::SessionRequestDto;
use crate::models::payment::SessionResponse;
use crate::utils;
use actix_web::get;
use actix_web::post;
use actix_web::web;
use actix_web::HttpResponse;
use actix_web::Responder;
use std::str::FromStr;
use stripe::CheckoutSession;
use stripe::CheckoutSessionId;
use stripe::CheckoutSessionMode;
use stripe::CheckoutSessionStatus;
use stripe::Client;
use stripe::CreateCheckoutSession;
use stripe::CreateCheckoutSessionLineItems;
use stripe::CreateCheckoutSessionLineItemsPriceData;
use stripe::CreateCheckoutSessionLineItemsPriceDataProductData;
use stripe::Currency;

fn parse_currency(currency_str: &str) -> Result<Currency, String> {
    match currency_str.to_lowercase().as_str() {
        "usd" => Ok(Currency::USD),
        "eur" => Ok(Currency::EUR),
        _ => Err(format!("Unsupported currency: {currency_str}")),
    }
}

// Stripe payment processing
#[utoipa::path(
    post,
    path = "/api/v1/payment/create-payment-intent",
    request_body = CreatePaymentIntentDto,
    responses(
        (status = 201, description = "Payment intent created successfully", body = PaymentIntentResponse),
        (status = 400, description = "Invalid input"),
        (status = 500, description = "Internal server error")
    ),
    tag = "payment"
)]
#[post("/api/v1/payment/create-payment-intent")]
async fn create_payment_intent(payment_data: web::Json<CreatePaymentIntentDto>) -> impl Responder {
    // Validate currency
    let currency = match parse_currency(&payment_data.currency) {
        Ok(curr) => curr,
        Err(err) => {
            return Ok::<HttpResponse, actix_web::Error>(
                HttpResponse::BadRequest().json(ErrorResponse { error: err }),
            );
        }
    };

    // Validate amount (minimum $1 or €1)
    if payment_data.amount < 100 {
        return Ok(HttpResponse::BadRequest().json(ErrorResponse {
            error: "Minimum donation amount is 1.00".to_string(),
        }));
    }

    // Get the secret key from the environment variable
    let api_key = utils::secrets::read_secret_without_default("stripe_secret_key");
    let client = Client::new(api_key);

    let mut params = CreateCheckoutSession::new();
    params.mode = Some(CheckoutSessionMode::Payment);
    //todo: add success and cancel urls
    params.success_url =
        Some("http://localhost/donations/success?session_id={CHECKOUT_SESSION_ID}");
    params.cancel_url = Some("http://localhost/donations/cancel");

    params.line_items = Some(vec![CreateCheckoutSessionLineItems {
        quantity: Some(1),
        price_data: Some(CreateCheckoutSessionLineItemsPriceData {
            currency,
            unit_amount: Some(payment_data.amount),
            product_data: Some(CreateCheckoutSessionLineItemsPriceDataProductData {
                name: "Donation to Covenant Match".to_string(),
                description: Some("Thank you for supporting our platform!".to_string()),
                ..Default::default()
            }),
            ..Default::default()
        }),
        ..Default::default()
    }]);

    match CheckoutSession::create(&client, params).await {
        Ok(session) => {
            log::info!("Created Stripe session: {}", session.id);
            Ok(HttpResponse::Ok().json(PaymentResponse {
                session_id: session.id.to_string(),
            }))
        }
        Err(e) => {
            log::error!("Stripe error: {:?}", e);
            Ok(HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to create payment session".to_string(),
            }))
        }
    }
}

// Verify payment
#[utoipa::path(
    post,
    path = "/api/v1/payment/verify-payment",
    request_body = SessionRequestDto,
    responses(
        (status = 200, description = "Payment verified successfully"),
        (status = 400, description = "Invalid session ID"),
        (status = 500, description = "Internal server error")
    ),
    tag = "payment"
)]
#[post("/api/v1/payment/verify-payment")]
async fn verify_payment(session_id: web::Json<SessionRequestDto>) -> impl Responder {

    // Get the secret key from the environment variable
    let api_key = utils::secrets::read_secret_without_default("stripe_secret_key");
    let client = Client::new(api_key);

    match CheckoutSession::retrieve(
        &client,
        &CheckoutSessionId::from_str(session_id.session_id.as_str())
            .map_err(|e| actix_web::error::ErrorBadRequest(e.to_string()))?,
        &[],
    )
    .await
    {
        Ok(session) => {
            let status = match session.status {
                Some(CheckoutSessionStatus::Complete) => "complete",
                Some(CheckoutSessionStatus::Open) => "open",
                Some(CheckoutSessionStatus::Expired) => "expired",
                None => "unknown",
            };

            Ok::<HttpResponse, actix_web::Error>(HttpResponse::Ok().json(SessionResponse {
                status: status.to_string(),
                payment_status: format!("{:?}", session.payment_status),
                amount_total: session.amount_total,
                currency: session.currency.map(|c| format!("{c:?}")),
                customer_email: session.customer_details.and_then(|cd| cd.email),
            }))
        }
        Err(e) => {
            log::error!("Error retrieving session: {e:?}");
            Ok(HttpResponse::BadRequest().json(ErrorResponse {
                error: "Invalid session ID".to_string(),
            }))
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(create_payment_intent);
    cfg.service(verify_payment);
}
