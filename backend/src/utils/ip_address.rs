use actix_web::HttpRequest;

// Extract the real client IP address from Cloudflare headers
pub fn get_client_ip(req: &HttpRequest) -> String {
    // First try the Cloudflare-specific header
    if let Some(ip) = req
        .headers()
        .get("cf-connecting-ip")
        .and_then(|h| h.to_str().ok())
    {
        return ip.to_string();
    }

    // Try the standard X-Forwarded-For header as fallback
    if let Some(ip) = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
    {
        return ip.trim().to_string();
    }

    // Last resort: use the socket address
    req.peer_addr()
        .map_or_else(|| "unknown".to_string(), |addr| addr.ip().to_string())
}
