import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get password from the environment variable
    const correctPassword = process.env.NEXT_PUBLIC_TESTER_PASSWORD;
    
    // Parse the request body
    const body = await request.json();
    const { password } = body;
    
    // Validate the password
    const isValid = password === correctPassword;
    
    // Create response
    const response = NextResponse.json({ valid: isValid }, { status: 200 });
    
    // If password is valid, set cookie server-side
    if (isValid) {
      // Set cookie with proper attributes for Cloudflare environment
      response.cookies.set({
        name: 'tester_access',
        value: 'granted',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        sameSite: 'lax',
        secure: true, // For HTTPS
        httpOnly: false // Allow JavaScript access
      });
      
      console.log('Setting tester_access cookie server-side');
    }
    
    return response;
  } catch (error) {
    console.error('Error validating tester password:', error);
    return NextResponse.json(
      { valid: false, error: 'Error processing request' },
      { status: 500 }
    );
  }
} 