// index.js
import express from 'express';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import apacheMd5 from 'apache-md5';
import fetch from 'node-fetch';  // node-fetch v3 is ESM only

const app = express();

// Apply middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Environment configuration
const isProd = process.env.NODE_ENV === 'production';
const useValidation = process.env.SESSION_VALIDATION === 'true' || isProd;
console.log(`Running in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`Session validation is ${useValidation ? 'ENABLED' : 'DISABLED'}`);

// Session storage (using an in-memory map; use Redis in production)
const sessions = new Map();
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Generate a secure random session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// --------------------------
// 1. Updated Login Endpoint
// --------------------------
app.post('/login', async (req, res) => {
  console.log('Login attempt');
  const { username, password } = req.body;
  
  if (!username || !password) {
    console.log('Missing username or password');
    return res.redirect('/login?error=1');
  }
  
  try {
    // Forward credentials to your application's login API.
    const response = await fetch('http://backend:8080/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      console.log(`Login failed with status: ${response.status}`);
      return res.redirect('/login?error=1');
    }
    
    // Get authentication data from the application (e.g., token and additional info)
    const authData = await response.json();
    
    // Create a new session including the app's auth token and data.
    const sessionId = generateSessionId();
    console.log(`Generated session ID for "${username}": ${sessionId.substring(0, 8)}...`);
    
    sessions.set(sessionId, { 
      created: Date.now(),
      username: username,
      lastActive: Date.now(),
      appAuthToken: authData.token || null, // Store the token if provided
      appAuthData: authData
    });
    console.log('Session stored. Total sessions:', sessions.size);
    
    // Set the session cookie
    res.cookie('nginx_auth_session', sessionId, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge: SESSION_EXPIRY
    });
    
    // Redirect to the home page after a successful login
    res.redirect('/');
  } catch (error) {
    console.error('Error during authentication:', error);
    return res.redirect('/login?error=1');
  }
});

// -----------------------------
// 2. Updated Validate Endpoint
// -----------------------------
app.get('/validate', (req, res) => {
  console.log('Validate endpoint called');
  
  // Read the session ID from the cookie
  const sessionId = req.cookies.nginx_auth_session;
  if (!sessionId) {
    console.log('No session ID in cookies');
    return res.sendStatus(401);
  }
  console.log('Session ID from cookie:', sessionId.substring(0, 8) + '...');
  
  if (useValidation) {
    // Retrieve the session
    const session = sessions.get(sessionId);
    if (!session) {
      console.log('Session not found in storage');
      return res.sendStatus(401);
    }
    
    console.log('Session found for user:', session.username || 'unknown');
    
    // Check expiration
    const now = Date.now();
    if (now - session.created > SESSION_EXPIRY) {
      console.log('Session expired');
      sessions.delete(sessionId);
      return res.sendStatus(401);
    }
    
    // Update last active timestamp
    session.lastActive = now;
    
    // Pass along the application's auth token (if available) via response header
    if (session.appAuthToken) {
      res.set('X-Auth-Token', session.appAuthToken);
    }
  } else {
    console.log('Session validation is disabled, accepting any cookie');
  }
  
  // Session is accepted; return 200 OK.
  console.log('Session accepted');
  res.sendStatus(200);
});

// ---------------------
// 3. Logout Endpoint
// ---------------------
app.get('/logout', (req, res) => {
  const sessionId = req.cookies.nginx_auth_session;
  if (sessionId) {
    const session = sessions.get(sessionId);
    const username = session ? session.username : 'unknown';
    sessions.delete(sessionId);
    console.log(`Session for user "${username}" removed`);
  }
  res.clearCookie('nginx_auth_session');
  res.redirect('/login');
});

// ------------------------------
// 4. Status Endpoint (Debug)
// ------------------------------
app.get('/status', (req, res) => {
  console.log('Status endpoint called');
  const info = {
    status: 'running',
    environment: isProd ? 'production' : 'development',
    sessionValidation: useValidation ? 'enabled' : 'disabled',
    sessionCount: sessions.size,
    requestCookies: req.cookies,
  };
  
  if (!isProd) {
    info.sessions = Array.from(sessions.entries()).map(([id, session]) => ({
      id: id.substring(0, 8) + '...',
      created: new Date(session.created).toISOString(),
      lastActive: new Date(session.lastActive || session.created).toISOString(),
      username: session.username || 'unknown'
    }));
  }
  
  res.json(info);
});

// ---------------------------
// 5. Periodic Session Cleanup
// ---------------------------
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  for (const [id, session] of sessions.entries()) {
    if (now - session.created > SESSION_EXPIRY) {
      sessions.delete(id);
      expiredCount++;
    }
  }
  if (expiredCount > 0) {
    console.log(`Cleaned up ${expiredCount} expired sessions`);
  }
}, 3600000); // every hour

// ---------------------------
// 6. Start the Auth Service
// ---------------------------
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});
