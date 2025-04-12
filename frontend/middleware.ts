import { NextRequest, NextResponse } from 'next/server';

// Ensure the environment variable is properly checked for multiple truthy values
const TESTER_MODE_VAR = process.env.NEXT_PUBLIC_TESTER_MODE;
const TESTER_MODE = TESTER_MODE_VAR === 'true' || TESTER_MODE_VAR === '"true"';

// Get tester password from environment variable with fallback
const TESTER_PASSWORD = process.env.NEXT_PUBLIC_TESTER_PASSWORD || 'test-covenant-45#';

// Enhanced debugging
console.log(`[MIDDLEWARE] Node ENV: ${process.env.NODE_ENV}`);
console.log(`[MIDDLEWARE] Tester mode raw value: "${TESTER_MODE_VAR}"`);
console.log(`[MIDDLEWARE] Tester mode parsed: ${TESTER_MODE ? 'ENABLED' : 'DISABLED'}`);
console.log(`[MIDDLEWARE] Password set: ${TESTER_PASSWORD ? 'YES' : 'NO'}`);

export function middleware(request: NextRequest) {
  // Log every request to debug
  console.log(`[MIDDLEWARE] Processing request for: ${request.nextUrl.pathname}`);

  // Explicitly force production mode to always use tester validation
  const forceTesterMode = process.env.NODE_ENV === 'production' || TESTER_MODE;
  console.log(`[MIDDLEWARE] Force tester mode: ${forceTesterMode ? 'YES' : 'NO'}`);

  // When tester mode is active, we want to check if the user is authorized
  if (forceTesterMode) {
    // Public paths that should not be redirected (like images, etc.)
    const publicPaths = [
      '/favicon.ico',
      '/_next',
      '/api',
      '/api/validate-tester-password',
      '/images',
      '/nightreign-bg.jpeg',
      '/coming-soon.html'
    ];

    // Check if URL matches any of the public paths
    if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
      console.log(`[MIDDLEWARE] Skipping auth for public path: ${request.nextUrl.pathname}`);
      return NextResponse.next();
    }

    // Check for tester access cookie
    const hasTesterAccess = request.cookies.get('tester_access')?.value === 'granted';
    console.log(`[MIDDLEWARE] Has tester access cookie: ${hasTesterAccess ? 'YES' : 'NO'}`);
    
    // Add cache control headers to prevent caching
    const response = hasTesterAccess ? 
      NextResponse.next() : 
      new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Covenant Match - Coming Soon</title>
          <link rel="stylesheet" href="/_next/static/css/app/layout.css">
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 0;
              min-height: 100vh;
              background: linear-gradient(to bottom right, #5b21b6, #312e81);
              color: #f8fafc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .container {
              width: 90%;
              max-width: 400px;
              text-align: center;
              margin-bottom: 2rem;
            }
            h1 {
              font-size: 2.5rem;
              font-weight: 700;
              margin-bottom: 1rem;
            }
            p {
              margin-bottom: 2rem;
              opacity: 0.9;
            }
            .card {
              background-color: rgba(30, 41, 59, 0.8);
              border: 1px solid rgba(100, 116, 139, 0.2);
              border-radius: 0.5rem;
              padding: 1.5rem;
              width: 90%;
              max-width: 400px;
            }
            .form-group {
              margin-bottom: 1rem;
              text-align: left;
            }
            label {
              display: block;
              margin-bottom: 0.5rem;
              font-size: 0.875rem;
            }
            input {
              width: 100%;
              padding: 0.5rem;
              border-radius: 0.25rem;
              border: 1px solid rgba(100, 116, 139, 0.3);
              background-color: rgba(15, 23, 42, 0.3);
              color: white;
              font-size: 1rem;
            }
            button {
              width: 100%;
              padding: 0.6rem;
              background-color: #6d28d9;
              color: white;
              border: none;
              border-radius: 0.25rem;
              font-size: 0.875rem;
              cursor: pointer;
              transition: background-color 0.2s;
            }
            button:hover {
              background-color: #5b21b6;
            }
            .footer {
              font-size: 0.75rem;
              opacity: 0.7;
              margin-top: 1rem;
              text-align: center;
            }
            .error {
              background-color: #fecaca;
              border: 1px solid #f87171;
              border-radius: 0.25rem;
              color: #b91c1c;
              padding: 0.5rem;
              margin-bottom: 1rem;
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Covenant Match</h1>
            <p>We're preparing to launch Covenant Match - the ultimate Nightreign companion.</p>
          </div>
          
          <div class="card">
            <h2 style="font-size: 1.25rem; margin-top: 0;">Tester Access</h2>
            <p style="font-size: 0.875rem; opacity: 0.7; margin-bottom: 1.5rem;">Enter the tester password to access the app</p>
            
            <div id="error-message" class="error">
              Incorrect password. Please try again.
            </div>
            
            <form id="access-form">
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="Enter tester password" required>
              </div>
              
              <button type="submit" id="submit-btn">Access App</button>
            </form>
            
            <div class="footer">
              © ${new Date().getFullYear()} Covenant Match
            </div>
          </div>
          
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              const form = document.getElementById('access-form');
              const errorMsg = document.getElementById('error-message');
              const submitBtn = document.getElementById('submit-btn');
              const password = document.getElementById('password');
              
              form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Clear any previous errors
                errorMsg.style.display = 'none';
                
                // Disable button and show loading state
                submitBtn.disabled = true;
                submitBtn.innerText = 'Checking...';
                
                // Check password - client-side only for simplicity
                // Console log for debugging
                console.log('Password entered:', password.value);
                
                // Send password to a validation endpoint instead of checking locally
                fetch('/api/validate-tester-password', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ password: password.value }),
                })
                .then(response => response.json())
                .then(data => {
                  if (data.valid) {
                    // Set cookie
                    document.cookie = "tester_access=granted; max-age=604800; path=/; samesite=lax" + 
                                     (location.protocol === 'https:' ? '; secure' : '');
                    
                    // Log success and redirect
                    console.log('Password correct, redirecting...');
                    window.location.href = "/";
                  } else {
                    // Show error
                    console.log('Password incorrect');
                    errorMsg.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Access App';
                  }
                })
                .catch(error => {
                  console.error('Error validating password:', error);
                  errorMsg.innerText = "An error occurred. Please try again.";
                  errorMsg.style.display = 'block';
                  submitBtn.disabled = false;
                  submitBtn.innerText = 'Access App';
                });
              });
            });
          </script>
        </body>
        </html>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store',
          },
        }
      );
    
    // Always add cache control headers to prevent caching regardless of response type
    const headersToAdd = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    };

    if (hasTesterAccess) {
      // For authenticated users, create a new response with headers
      const authResponse = NextResponse.next();
      Object.entries(headersToAdd).forEach(([name, value]) => {
        authResponse.headers.set(name, value);
      });
      return authResponse;
    }

    console.log('[MIDDLEWARE] Returning response with no-cache headers');
    return response;
  }

  // Continue with the request for authenticated users or when tester mode is off
  console.log('[MIDDLEWARE] Allowing access - tester mode is disabled');
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  // Apply to all routes except API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
