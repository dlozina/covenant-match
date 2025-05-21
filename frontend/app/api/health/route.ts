import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Health check endpoint for Docker Swarm
export async function GET(request: Request) {

  try {
    // Get the IP address of the request
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
    
    console.log(`Health check request from: ${ip}`);
    
    // Check if IP is allowed (similar to your Rust backend)
    const isAllowed = isAllowedIP(ip);
    
    if (!isAllowed) {
      console.warn(`Unauthorized health check attempt from IP: ${ip}`);
      // Return 404 to hide the endpoint
      return new NextResponse(null, { status: 404 });
    }
  
    // Check for critical environment variables
    const envVarsStatus = !!process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // Determine overall health
    const isHealthy = envVarsStatus;
    
    // Return health status
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      checks: {
        environmentVariables: envVarsStatus,
      }
    }, {
      status: isHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('Unhandled error in health check:', error);
    return NextResponse.json({
      status: 'degraded',
      error: 'Internal health check error'
    }, { status: 503 });
  }
}

// Function to check if IP is allowed
function isAllowedIP(ip: string): boolean {
  try {
    // Check if it's localhost
    if (ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') {
      return true;
    }
    
    // Check private IP ranges
    const ipParts = ip.split('.').map(part => parseInt(part, 10));
    
    // Check if valid IPv4 format
    if (ipParts.length !== 4 || ipParts.some(part => isNaN(part) || part < 0 || part > 255)) {
      return false;
    }
    
    // 10.0.0.0/8
    if (ipParts[0] === 10) {
      return true;
    }
    
    // 172.16.0.0/12
    if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) {
      return true;
    }
    
    // 192.168.0.0/16
    if (ipParts[0] === 192 && ipParts[1] === 168) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking IP:', error);
    return false;
  }
}