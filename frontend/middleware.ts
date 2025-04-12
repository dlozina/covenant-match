import { NextRequest, NextResponse } from 'next/server';

// Environment variable to check if tester mode is active
const TESTER_MODE = process.env.NEXT_PUBLIC_TESTER_MODE === 'true';
// Get tester password from environment variable with fallback
const TESTER_PASSWORD = process.env.NEXT_PUBLIC_TESTER_PASSWORD || 'covenant-test-22#';

// Just for debugging
console.log(`Tester mode: ${TESTER_MODE ? 'ENABLED' : 'DISABLED'}`);
console.log(`Password set: ${TESTER_PASSWORD ? 'YES' : 'NO'}`);
console.log(`Password value: ${TESTER_PASSWORD}`); // Debug the actual password

export function middleware(request: NextRequest) {
  // Skip middleware in development mode when tester mode is not active
  if (process.env.NODE_ENV === 'development' && !TESTER_MODE) {
    return NextResponse.next();
  }

  // When tester mode is active, we want to check if the user is authorized
  if (TESTER_MODE) {
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
      return NextResponse.next();
    }

    // Check for tester access cookie
    const hasTesterAccess = request.cookies.get('tester_access')?.value === 'granted';

    // If no tester access, serve the coming soon page directly from middleware
    if (!hasTesterAccess) {
      // Serve a custom HTML coming soon page directly from middleware
      return new NextResponse(
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
                    document.cookie = "tester_access=granted; max-age=604800; path=/; samesite=strict" + 
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
          },
        }
      );
    }
  }

  // Continue with the request for authenticated users or when tester mode is off
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
