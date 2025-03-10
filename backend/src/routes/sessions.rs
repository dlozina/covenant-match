use actix_web::{web, HttpResponse, Responder, post, get, delete, put};
use mongodb::Database;
use crate::models::session::{CreateSessionDto, JoinSessionDto, SubmitResultDto};
use crate::services::session_service;

#[get("/sessions")]
async fn get_sessions(
    db: web::Data<Database>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let status = query.get("status").cloned();
    
    match session_service::get_sessions(&db, status).await {
        Ok(sessions) => HttpResponse::Ok().json(sessions),
        Err(e) => {
            log::error!("Error fetching sessions: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

// #[post("/sessions")]
// async fn create_session(
//     db: web::Data<Database>,
//     session_data: web::Json<CreateSessionDto>,
//     // Will add user authentication later
// ) -> impl Responder {
//     match session_service::create_session(&db, session_data.into_inner()).await {
//         Ok(session) => HttpResponse::Created().json(session),
//         Err(e) => {
//             log::error!("Error creating session: {:?}", e);
//             HttpResponse::InternalServerError().json(serde_json::json!({
//                 "status": "error",
//                 "message": e.to_string()
//             }))
//         }
//     }
// }

#[get("/sessions/{id}")]
async fn get_session(
    db: web::Data<Database>,
    path: web::Path<String>,
) -> impl Responder {
    let id = path.into_inner();
    
    match session_service::get_session_by_id(&db, &id).await {
        Ok(Some(session)) => HttpResponse::Ok().json(session),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "status": "error",
            "message": "Session not found"
        })),
        Err(e) => {
            log::error!("Error fetching session: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

// #[post("/sessions/{id}/join")]
// async fn join_session(
//     db: web::Data<Database>,
//     path: web::Path<String>,
//     join_data: web::Json<JoinSessionDto>,
// ) -> impl Responder {
//     let id = path.into_inner();
    
//     match session_service::join_session(&db, &id, join_data.into_inner()).await {
//         Ok(session) => HttpResponse::Ok().json(session),
//         Err(e) => {
//             log::error!("Error joining session: {:?}", e);
//             HttpResponse::BadRequest().json(serde_json::json!({
//                 "status": "error",
//                 "message": e.to_string()
//             }))
//         }
//     }
// }

#[post("/sessions/{id}/start")]
async fn start_session(
    db: web::Data<Database>,
    path: web::Path<String>,
    // Will add user authentication later
) -> impl Responder {
    let id = path.into_inner();
    
    match session_service::start_session(&db, &id).await {
        Ok(session) => HttpResponse::Ok().json(session),
        Err(e) => {
            log::error!("Error starting session: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

#[post("/sessions/{id}/results")]
async fn submit_result(
    db: web::Data<Database>,
    path: web::Path<String>,
    result_data: web::Json<SubmitResultDto>,
) -> impl Responder {
    let id = path.into_inner();
    
    match session_service::submit_result(&db, &id, result_data.into_inner()).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "status": "success",
            "message": "Result submitted successfully"
        })),
        Err(e) => {
            log::error!("Error submitting result: {:?}", e);
            HttpResponse::BadRequest().json(serde_json::json!({
                "status": "error",
                "message": e.to_string()
            }))
        }
    }
}

pub fn config(cfg: &mut web::ServiceConfig) {
    cfg.service(get_sessions)
       //.service(create_session)
       .service(get_session)
       //.service(join_session)
       .service(start_session)
       .service(submit_result);
}
