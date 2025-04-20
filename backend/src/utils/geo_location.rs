use crate::models::geo_location::GeoLocation;
use actix_web::HttpRequest;
use log::{error, info};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::sync::OnceLock;

// Static map initialized once
static REGION_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();

// Load region map from CSV file
fn load_region_map() -> HashMap<String, String> {
    let mut map = HashMap::new();

    // Determine the file path - try multiple possible locations
    let possible_paths = [
        "config/region_map.csv",
        "backend/config/region_map.csv",
        "/app/config/region_map.csv", // For docker/production environments
    ];

    let mut file_path = None;
    for path in possible_paths {
        if Path::new(path).exists() {
            file_path = Some(path);
            break;
        }
    }

    let Some(path) = file_path else {
        error!("Region map CSV file not found in any of the expected locations");
        return map; // Return empty map if file not found
    };

    info!("Loading region map from: {}", path);

    // Open the file
    let file = match File::open(path) {
        Ok(f) => f,
        Err(e) => {
            error!("Failed to open region map file: {}", e);
            return map;
        }
    };

    let reader = BufReader::new(file);
    let mut is_header = true;

    // Parse CSV
    for line in reader.lines() {
        match line {
            Ok(line) => {
                // Skip header line
                if is_header {
                    is_header = false;
                    continue;
                }

                let fields: Vec<&str> = line.split(',').collect();
                if fields.len() >= 3 {
                    let country_code = fields[1].trim().to_string();
                    let region = fields[2].trim().to_string();
                    map.insert(country_code, region);
                }
            }
            Err(e) => {
                error!("Error reading line from region map CSV: {}", e);
            }
        }
    }

    info!("Loaded {} country-to-region mappings", map.len());
    map
}

// Get region from country code using our mapping
fn get_region_from_country(country_code: &str) -> String {
    // Initialize the map if not already done
    let region_map = REGION_MAP.get_or_init(load_region_map);

    // Convert country code to uppercase for consistency
    let country_code = country_code.to_uppercase();

    region_map.get(&country_code).map_or_else(
        || {
            error!("Country code '{}' not found in region map", country_code);
            "Unknown".to_string()
        },
        ToString::to_string,
    )
}

// Extract all geolocation data from Cloudflare headers
pub fn get_client_region(req: &HttpRequest) -> GeoLocation {
    let headers = req.headers();

    // Extract country code --> Mainly used for matchmaking region!!!
    let country = headers
        .get("cf-ipcountry")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    // Extract city
    let city = headers
        .get("cf-ipcity")
        .and_then(|h| h.to_str().ok())
        .map(ToString::to_string);

    // Extract continent
    let continent = headers
        .get("cf-ipcontinent")
        .and_then(|h| h.to_str().ok())
        .map(ToString::to_string);

    // Extract region --> Secondary for matchmaking region, we have our own region mapping
    let region_from_header = headers
        .get("cf-region")
        .and_then(|h| h.to_str().ok())
        .map(ToString::to_string);

    // Extract region code
    let region_code = headers
        .get("cf-region-code")
        .and_then(|h| h.to_str().ok())
        .map(ToString::to_string);

    // Extract metro code
    let metro_code = headers
        .get("cf-metro-code")
        .and_then(|h| h.to_str().ok())
        .map(ToString::to_string);

    // Extract postal code
    let postal_code = headers
        .get("cf-postal-code")
        .and_then(|h| h.to_str().ok())
        .map(ToString::to_string);

    // Extract timezone
    let timezone = headers
        .get("cf-timezone")
        .and_then(|h| h.to_str().ok())
        .map(ToString::to_string);

    // Extract latitude if available
    let latitude = headers
        .get("cf-iplatitude")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.parse::<f64>().ok());

    // Extract longitude if available
    let longitude = headers
        .get("cf-iplongitude")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.parse::<f64>().ok());

    // Get matchmaking region based on our CSV mapping
    let matchmaking_region = get_region_from_country(&country);

    GeoLocation {
        country,
        city,
        continent,
        cm_region: matchmaking_region,
        cf_region: region_from_header,
        region_code,
        metro_code,
        postal_code,
        timezone,
        latitude,
        longitude,
    }
}
