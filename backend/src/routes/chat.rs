use crate::services::chat_service::ChatService;
use crate::services::user_service;
use crate::utils::jwt;
use actix_web::{web, HttpMessage, HttpRequest, HttpResponse, Responder};
use log::debug;
use mongodb::Database;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Removed ChatHistoryParams and ChatMessage structs since they're now in admin.rs

// config function at the bottom of the file needs to be updated
pub fn config(_cfg: &mut web::ServiceConfig) {
    // Removed the get_chat_history service registration
}
