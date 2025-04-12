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
    
    // Return response
    return NextResponse.json({ valid: isValid }, { status: 200 });
  } catch (error) {
    console.error('Error validating tester password:', error);
    return NextResponse.json(
      { valid: false, error: 'Error processing request' },
      { status: 500 }
    );
  }
} 