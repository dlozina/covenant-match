"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

// Global constants
export const TOKEN_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds (was 10 minutes)

// Define the user data type
type UserData = {
  id: string;
  username: string;
  email: string;
  region?: string;
  platform?: string;
  autoRegion?: boolean;
  cmRegion?: string;
  cfRegion?: string;
  covenantName?: string;
  experience?: string;
  preferredSessionName?: string;
  preferredSessionPassword?: string;
  preferredNightfarer?: string;
  emailVerified?: boolean;
  role?: string;
  disabled?: boolean;
  // Add other user properties as needed
};

// Define the auth context type
type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userData: UserData | null;
  login: (token: string) => void;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  fetchWithAuth: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  getAuthHeaders: () => Promise<HeadersInit>;
  saveRedirectUrl: (url: string) => void;
};

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  userData: null,
  login: () => {},
  logout: () => {},
  refreshUserData: async () => {},
  refreshToken: async () => false,
  fetchWithAuth: async <T = unknown>(): Promise<T> => { throw new Error('Not implemented'); },
  getAuthHeaders: async (): Promise<HeadersInit> => { throw new Error('Not implemented'); },
  saveRedirectUrl: () => {},
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number>(0);
   
  //todo: We dont need this on frontend when testing is over
  // Helper to parse JWT and get expiration
  const getTokenExpiry = (token: string): number => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      console.log("JWT payload:", payload); // Log the JWT payload to debug
      return payload.exp * 1000; // Convert to milliseconds
    } catch (error) {
      console.error("Error parsing JWT token", error);
      return 0;
    }
  };

  // Function to fetch user data from the API
  const fetchUserData = useCallback(async (token: string): Promise<UserData | null> => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      
      console.log("Raw user data from API:", data);
      
      // Map the response data to our UserData type
      return {
        id: data.id,
        username: data.username,
        email: data.email,
        region: data.region,
        platform: data.platform,
        autoRegion: data.autoRegion,
        cmRegion: data.cmRegion,
        cfRegion: data.cfRegion,
        covenantName: data.covenantName,
        experience: data.experience,
        preferredSessionName: data.preferredSessionName,
        preferredSessionPassword: data.preferredSessionPassword,
        preferredNightfarer: data.preferredNightfarer,
        emailVerified: data.emailVerified,
        role: data.role,
        disabled: data.disabled,
      };
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }, []);

  // Function to refresh the auth token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      // Avoid excessive token refreshes
      const now = Date.now();
      if (now - lastTokenRefresh < 60000) { // Only refresh once per minute at most
        return true;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        // Check for unauthorized (expired token)
        if (response.status === 401) {
          // Token is no longer valid, clear it
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setUserData(null);
          return false;
        }
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      if (data.token) {
        // Store the token directly to avoid next.js cache expiration
        localStorage.setItem('token', data.token);
        
        //todo: We dont need this on frontend when testing is over
        // Get actual expiration time from the token
        const expiry = getTokenExpiry(data.token);
        const expiresIn = expiry - now;
        console.log(`Token refreshed successfully. Expires in ${Math.floor(expiresIn / 3600000)}h ${Math.floor((expiresIn % 3600000) / 60000)}m`);
        
        setLastTokenRefresh(now);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Don't log out on network errors, only on auth errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error, might be temporary
        return false;
      }
      return false;
    }
  }, [lastTokenRefresh]);

  // Function to refresh user data
  const refreshUserData = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const data = await fetchUserData(token);
    if (data) {
      console.log("Setting user data in state:", data);
      setUserData(data);
      setIsLoggedIn(true);
    }
  }, [fetchUserData]);

  // Function to save the redirect URL when user isn't logged in
  const saveRedirectUrl = useCallback((url: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('redirectAfterLogin', url);
    }
  }, []);

  // Login function with redirect handling
  const login = useCallback(async (token: string, userData?: UserData | null): Promise<UserData | null> => {
    try {
      // Fetch user data if not provided
      const data = userData || await fetchUserData(token);
      
      // Check if account is not verified
      if (data && !data.emailVerified) {
        // Account is not verified - throw a specific error for not verified accounts
        const notVerifiedError = new Error('Your account has not been verified. Please check your email for verification instructions.');
        // Add property to identify this is a not verified account error
        Object.defineProperty(notVerifiedError, 'isNotVerifiedAccount', { value: true });
        throw notVerifiedError;
      }
      
      // Check if account is disabled
      if (data && data.disabled) {
        // Account is disabled - throw a specific error for disabled accounts
        const disabledError = new Error('Your account has been disabled. Please contact support for assistance.');
        // Add property to identify this is a disabled account error
        Object.defineProperty(disabledError, 'isDisabledAccount', { value: true });
        throw disabledError;
      }
      
      // Store the token in localStorage for persistent auth
      localStorage.setItem('token', token);
      
      // Get current timestamp
      const now = Date.now();
      
      const expiry = getTokenExpiry(token);
      const expiresIn = expiry - now;
      console.log(`Login successful. Token expires in ${Math.floor(expiresIn / 3600000)}h ${Math.floor((expiresIn % 3600000) / 60000)}m`);
      
      setIsLoggedIn(true);
      setLastTokenRefresh(now);
      
      // If we already have user data, set it directly to avoid a second API call
      if (data) {
        setUserData(data);
      } else {
        refreshUserData();
      }
      
      return data || null; // Return the user data or null
    } catch (error) {
      // Don't store token or set logged in state if there's an error
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setUserData(null);
      throw error;
    }
  }, [fetchUserData, getTokenExpiry, refreshUserData]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUserData(null);
    
    // Important: We need to redirect to home page if on a protected route
    // Redirect to home page if on a protected route
    const protectedRoutes = ['/dashboard', '/profile', '/edit-profile'];
    if (protectedRoutes.some(route => pathname?.startsWith(route))) {
      router.push('/');
    }
  }, [pathname, router]);

  // Check authentication status function
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoggedIn(false);
        setUserData(null);
        setIsLoading(false);
        return;
      }

      // Try to fetch user data with current token
      let data = await fetchUserData(token);
      
      // If fetching user data fails, try to refresh the token
      if (!data) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Try again with the new token
          const newToken = localStorage.getItem('token');
          data = await fetchUserData(newToken!);
        }
      }
      
      if (data) {
        // First check if email is verified
        if (!data.emailVerified) {
          // Email not verified - clear token and log out
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setUserData(null);
          console.warn('User logged out: Email not verified');
        }
        // Then check if the account is disabled
        else if (data.disabled) {
          // Account is disabled - logout and clear token
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setUserData(null);
          console.warn('User logged out: Account is disabled');
        } else {
          // Account is active and verified - proceed normally
          setUserData(data);
          setIsLoggedIn(true);
        }
      } else {
        // Invalid token and refresh failed
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUserData(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      
      // Try to refresh token on error before giving up
      try {
        const refreshed = await refreshToken();
        if (refreshed) {
          const token = localStorage.getItem('token');
          const data = await fetchUserData(token!);
          if (data) {
            // First check if email is verified
            if (!data.emailVerified) {
              // Email not verified - clear token and log out
              localStorage.removeItem('token');
              setIsLoggedIn(false);
              setUserData(null);
              console.warn('User logged out after refresh: Email not verified');
            }
            // Then check if account is disabled
            else if (data.disabled) {
              localStorage.removeItem('token');
              setIsLoggedIn(false);
              setUserData(null);
              console.warn('User logged out after refresh: Account is disabled');
            } else {
              setUserData(data);
              setIsLoggedIn(true);
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (refreshError) {
        console.error("Token refresh attempt failed:", refreshError);
      }
      
      setIsLoggedIn(false);
      setUserData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserData, refreshToken]);

  // Check authentication status on initial load and when pathname changes
  useEffect(() => {
    checkAuthStatus();
  }, [pathname, checkAuthStatus]);

  // Periodic token refresh for long-running sessions - updated for 12-hour expiry
  useEffect(() => {
    // Don't set up refreshes if not logged in
    if (!isLoggedIn) return;
    
    // Check current token expiration
    const token = localStorage.getItem('token');
    if (token) {
      const now = Date.now();
      const expiry = getTokenExpiry(token);
      
      // Calculate time remaining until expiration in milliseconds
      const timeToExpiry = Math.max(0, expiry - now);
      
      // For 12-hour tokens, refresh at 75% of remaining time or 1 hour, whichever is less
      // This gives us a more balanced approach for longer tokens
      const refreshTime = Math.min(timeToExpiry * 0.75, TOKEN_REFRESH_INTERVAL);
      
      console.log(`Token expires in ${Math.floor(timeToExpiry / 3600000)}h ${Math.floor((timeToExpiry % 3600000) / 60000)}m. Setting up refresh in ${Math.floor(refreshTime / 60000)}m`);
      
      // Set up periodic token refresh 
      const refreshInterval = setInterval(async () => {
        // Only try to refresh if user is logged in
        if (isLoggedIn) {
          await refreshToken();
        }
      }, refreshTime);
      
      return () => clearInterval(refreshInterval);
    }
  }, [isLoggedIn, refreshToken]);

  // Add fetchWithAuth implementation inside AuthProvider
  const fetchWithAuth = useCallback(async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
    // Get token from storage
    let token = localStorage.getItem('token');
    if (!token) {
      // Not logged in
      throw new Error('Not authenticated');
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const expiry = getTokenExpiry(token);
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    
    if (expiry - now < FIVE_MINUTES) {
      // Token is expiring soon, refresh it
      const refreshSuccess = await refreshToken();
      if (!refreshSuccess) {
        // If refresh failed and token is expired, logout
        if (now >= expiry) {
          logout();
          throw new Error('Session expired');
        }
      } else {
        // Get the new token after refresh
        token = localStorage.getItem('token') || '';
      }
    }

    // Construct the full URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`;

    // Create a new headers object
    const customHeaders: HeadersInit = {
      'Authorization': `Bearer ${token}`
    };
    
    // Only set Content-Type if not FormData and if not already set
    const optionsHeaders = options.headers as Record<string, string> || {};
    if (!(options.body instanceof FormData) && !optionsHeaders['Content-Type']) {
      customHeaders['Content-Type'] = 'application/json';
    }
    
    // Merge with any headers from options
    const headers = {
      ...customHeaders,
      ...optionsHeaders
    };

    try {
      // Make the API call
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include'
      });

      // Handle authentication errors by attempting refresh once
      if (response.status === 401) {
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          // Retry with new token
          const newToken = localStorage.getItem('token');
          const newHeaders = {
            ...headers,
            'Authorization': `Bearer ${newToken}`
          };

          const retryResponse = await fetch(fullUrl, {
            ...options,
            headers: newHeaders,
            credentials: 'include'
          });

          if (retryResponse.ok) {
            // Check if response is JSON
            const contentType = retryResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              return await retryResponse.json();
            } else {
              return await retryResponse.text() as unknown as T;
            }
          }
        }

        // If we reach here, the refresh or retry failed
        logout();
        throw new Error('Session expired');
      }

      // Handle successful response
      if (!response.ok) {
        // Try to get error details
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `API request failed: ${response.status}`);
        } catch (parseError) {
          // If parsing fails, use generic error
          throw new Error(`API request failed: ${response.status} with error ${parseError}`);
        }
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as unknown as T;
      }
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }, [refreshToken, logout]);

  // Add getAuthHeaders implementation inside AuthProvider
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    // Get token from storage
    let token = localStorage.getItem('token');
    if (!token) {
      // Not logged in
      throw new Error('Not authenticated');
    }

    // Check if token is expired or will expire soon (within 5 minutes)
    const expiry = getTokenExpiry(token);
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    
    if (expiry - now < FIVE_MINUTES) {
      // Token is expiring soon, refresh it
      const refreshSuccess = await refreshToken();
      if (!refreshSuccess) {
        // If refresh failed and token is expired, logout
        if (now >= expiry) {
          logout();
          throw new Error('Session expired');
        }
      } else {
        // Get the new token after refresh
        token = localStorage.getItem('token') || '';
      }
    }

    // Create headers with Authorization
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, [refreshToken, logout]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        userData,
        login,
        logout,
        refreshUserData,
        refreshToken,
        fetchWithAuth,
        getAuthHeaders,
        saveRedirectUrl
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 