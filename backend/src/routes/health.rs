use actix_web::{get, HttpResponse, Responder, web};

#[get("/health")]
async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "message": "Service is healthy"
    }))
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(health_check);
}
