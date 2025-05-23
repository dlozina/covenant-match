use crate::models::payment::CreatePaymentIntentDto;
use crate::models::payment::ErrorResponse;
use crate::models::payment::PaymentResponse;
use crate::utils;
use actix_web::post;
use actix_web::web;
use actix_web::HttpResponse;
use actix_web::Responder;
use stripe::CheckoutSession;
use stripe::CheckoutSessionMode;
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
    params.success_url = Some("https://yoursite.com/success");
    params.cancel_url = Some("https://yoursite.com/cancel");

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
            println!("Created Stripe session: {}", session.id);
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

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(create_payment_intent);
}   
