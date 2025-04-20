use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize)]
pub struct GeoLocation {
    pub country: String,
    pub city: Option<String>,
    pub continent: Option<String>,
    pub cm_region: String,
    pub cf_region: Option<String>,
    pub region_code: Option<String>,
    pub metro_code: Option<String>,
    pub postal_code: Option<String>,
    pub timezone: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

/// Data transfer object for geo-location information exposed through the API
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GeoLocationDataDto {
    /// Country code (e.g., "US", "GB")
    pub country: String,
    /// City name if available
    pub city: Option<String>,
    /// Continent name if available
    pub continent: Option<String>,
    /// Covenant Match region for matchmaking
    pub region: String,
    /// Timezone information
    pub timezone: Option<String>,
    /// Coordinates for map display
    pub coordinates: Option<CoordinatesDto>,
}

/// Geographic coordinates for location display
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CoordinatesDto {
    pub latitude: f64,
    pub longitude: f64,
}

impl From<GeoLocation> for GeoLocationDataDto {
    fn from(geo: GeoLocation) -> Self {
        let coordinates = match (geo.latitude, geo.longitude) {
            (Some(lat), Some(lng)) => Some(CoordinatesDto {
                latitude: lat,
                longitude: lng,
            }),
            _ => None,
        };

        Self {
            country: geo.country,
            city: geo.city,
            continent: geo.continent,
            region: geo.cm_region,
            timezone: geo.timezone,
            coordinates,
        }
    }
}
