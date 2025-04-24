use chrono::DateTime;
use mongodb::bson::{self, oid::ObjectId};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct News {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub title: String,
    pub content: String,
    pub summary: String,
    pub image_url: Option<String>,
    pub author_id: String,
    pub author_username: String,
    pub updated_by_id: String,
    pub updated_by_username: String,
    pub published: bool,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct NewsResponse {
    pub id: String,
    pub title: String,
    pub summary: String,
    pub content: String,
    pub image_url: Option<String>,
    pub author_id: Option<String>,
    pub author_username: String,
    pub updated_by_id: Option<String>,
    pub updated_by_username: Option<String>,
    pub published: bool,
    pub created_at: bson::DateTime,
    pub updated_at: bson::DateTime,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_ago: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct NewsListResponse {
    pub status: String,
    pub data: NewsListData,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct NewsListData {
    pub news: Vec<NewsResponse>,
    pub pagination: Option<PaginationInfo>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PaginationInfo {
    pub total: u64,
    pub page: u64,
    pub limit: u64,
    pub total_pages: u64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateNewsDto {
    pub title: String,
    pub summary: String,
    pub content: String,
    pub image_url: Option<String>,
    pub published: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateNewsDto {
    pub title: Option<String>,
    pub content: Option<String>,
    pub summary: Option<String>,
    pub image_url: Option<String>,
    pub published: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Announcement {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub active: bool,
    pub content: String,
    pub updated_by_id: String,
    pub updated_by_username: String,
    pub updated_at: bson::DateTime,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateAnnouncementDto {
    pub active: bool,
    pub content: String,
    #[serde(rename = "updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

impl From<News> for NewsResponse {
    fn from(news: News) -> Self {
        let created_time =
            chrono::DateTime::from_timestamp_millis(news.created_at.timestamp_millis());

        let time_ago = created_time.map(|time| {
            let now = chrono::Utc::now();
            let duration = now.signed_duration_since(time);

            if duration.num_days() > 0 {
                format!("{} days ago", duration.num_days())
            } else if duration.num_hours() > 0 {
                format!("{} hours ago", duration.num_hours())
            } else if duration.num_minutes() > 0 {
                format!("{} minutes ago", duration.num_minutes())
            } else {
                "just now".to_string()
            }
        });

        Self {
            id: news.id.to_hex(),
            title: news.title,
            content: news.content,
            summary: news.summary,
            image_url: news.image_url,
            author_id: Some(news.author_id),
            author_username: news.author_username,
            updated_by_id: Some(news.updated_by_id),
            updated_by_username: Some(news.updated_by_username),
            published: news.published,
            created_at: news.created_at,
            updated_at: news.updated_at,
            time_ago,
        }
    }
}

// A helper conversion for sending responses
impl Announcement {
    pub fn to_response(&self) -> AnnouncementResponse {
        AnnouncementResponse {
            id: self.id.to_hex(),
            active: self.active,
            content: self.content.clone(),
            updated_by_id: self.updated_by_id.clone(),
            updated_by_username: self.updated_by_username.clone(),
            updated_at: self.updated_at,
        }
    }
}

// Response struct for API
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct AnnouncementResponse {
    pub id: String,
    pub active: bool,
    pub content: String,
    pub updated_by_id: String,
    pub updated_by_username: String,
    pub updated_at: bson::DateTime,
}
