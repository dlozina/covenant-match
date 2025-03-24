use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct Platform {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub name: String,
    pub description: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub schema_version: i32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct Region {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub name: String,
    pub description: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub schema_version: i32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone)]
pub struct Covenant {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub name: String,
    pub description: String,
    pub created_at: DateTime,
    pub updated_at: DateTime,
    pub schema_version: i32,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct GameDataResponse {
    pub platforms: Vec<PlatformResponse>,
    pub regions: Vec<RegionResponse>,
    pub covenants: Vec<CovenantResponse>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PlatformResponse {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct RegionResponse {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CovenantResponse {
    pub id: String,
    pub name: String,
    pub description: String,
}

// Implement From traits for converting from database models to response DTOs
impl From<Platform> for PlatformResponse {
    fn from(platform: Platform) -> Self {
        Self {
            id: platform.id.to_hex(),
            name: platform.name,
            description: platform.description,
        }
    }
}

impl From<Region> for RegionResponse {
    fn from(region: Region) -> Self {
        Self {
            id: region.id.to_hex(),
            name: region.name,
            description: region.description,
        }
    }
}

impl From<Covenant> for CovenantResponse {
    fn from(covenant: Covenant) -> Self {
        Self {
            id: covenant.id.to_hex(),
            name: covenant.name,
            description: covenant.description,
        }
    }
}
