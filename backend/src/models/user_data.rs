use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::geo_location::GeoLocationDataDto;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserDataResponseDto {
    pub ip_address: String,
    pub geo_location_data: GeoLocationDataDto,
    pub email: Option<String>,
    #[schema(format = "password")]
    pub password: Option<String>,
    pub region: Option<String>,
    pub auto_region: Option<bool>,
    pub platform: Option<String>,
    pub covenant_name: Option<String>,
    pub avatar_url: Option<String>,
    pub preferred_session_name: Option<String>,
    pub preferred_session_password: Option<String>,
    pub preferred_nightfarer: Option<String>,
}
