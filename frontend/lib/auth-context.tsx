"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

// Define the user data type
type UserData = {
  id: string;  // Add user ID
  username: string;
  displayName: string;
  email: string;
  region?: string;
  autoRegion?: boolean;
  covenantName?: string;
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
};

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  userData: null,
  login: () => {},
  logout: () => {},
  refreshUserData: async () => {},
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

  // Function to fetch user data from the API
  const fetchUserData = async (token: string): Promise<UserData | null> => {
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
      
      // Map the response data to our UserData type
      return {
        id: data.id,
        username: data.username,
        email: data.email,
        displayName: data.displayName,
        region: data.region,
        autoRegion: data.autoRegion,
        covenantName: data.covenantName,
      };
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Function to refresh user data
  const refreshUserData = async (): Promise<void> => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const data = await fetchUserData(token);
    if (data) {
      setUserData(data);
      setIsLoggedIn(true);
    }
  };

  // Login function
  const login = (token: string) => {
    localStorage.setItem('token', token);
    setIsLoggedIn(true);
    refreshUserData();
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUserData(null);
    
    // Redirect to home page if on a protected route
    const protectedRoutes = ['/dashboard', '/profile', '/edit-profile'];
    if (protectedRoutes.some(route => pathname?.startsWith(route))) {
      router.push('/');
    }
  };

  // Check authentication status on initial load and when pathname changes
  useEffect(() => {
    async function checkAuthStatus() {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsLoggedIn(false);
          setUserData(null);
          setIsLoading(false);
          return;
        }

        const data = await fetchUserData(token);
        
        if (data) {
          setUserData(data);
          setIsLoggedIn(true);
        } else {
          // Invalid token
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setUserData(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsLoggedIn(false);
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthStatus();
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      isLoading, 
      userData, 
      login, 
      logout,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
} 