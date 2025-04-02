// Define API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Helper to get JWT token
const getToken = (): string => {
  if (typeof document !== 'undefined') {
    // Browser environment
    const authCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth='));
    
    if (authCookie) {
      return authCookie.split('=')[1];
    }
    
    // Try to get token from localStorage if not in cookie
    const token = localStorage.getItem('token');
    if (token) {
      return token;
    }
  }
  return '';
};

// Types for session history
export interface SessionHistoryEntry {
  session_id: string;
  session_name: string;
  night_lord: string;
  player_nightfarer: string;
  player_result: string;
  created_at: string;
  completed_at: string | null;
}

// Types for session details
export interface PlayerDetail {
  user_id: string;
  username: string;
  nightfarer: string;
  result: string | null;
  joined_at: string;
}

export interface SessionDetail {
  session_id: string;
  session_name: string;
  night_lord: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  players: PlayerDetail[];
}

export interface SessionDetailResponse {
  status: string;
  data: SessionDetail;
}

// Pagination types
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedSessionHistory {
  pagination: PaginationInfo;
  sessions: SessionHistoryEntry[];
}

export interface PaginatedResponse<T> {
  status: string;
  data: T;
}

// Types for nightlords and nightfarers
export interface NightLord {
  id: string;
  name: string;
  description: string;
}

export interface Nightfarer {
  id: string;
  name: string;
  description: string;
}

// Function to fetch user session history
export const fetchUserSessionHistory = async (): Promise<SessionHistoryEntry[]> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/statistics/users/me/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching user session history: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user session history:', error);
    throw error;
  }
};

// Function to fetch user session history with pagination
export const fetchUserSessionHistoryPaginated = async (
  page: number = 0, // Frontend uses 0-indexed
  limit: number = 10
): Promise<PaginatedResponse<PaginatedSessionHistory>> => {
  try {
    // Backend uses 1-indexed, so we add 1 to the page number
    const response = await fetch(
      `${API_URL}/api/v1/statistics/users/me/sessions/paginated?page=${page + 1}&limit=${limit}`, 
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching paginated user session history: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Convert backend 1-indexed page to frontend 0-indexed
    if (data.data && data.data.pagination) {
      data.data.pagination.page -= 1;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to fetch paginated user session history:', error);
    throw error;
  }
};

// Function to fetch session details
export const fetchSessionDetails = async (sessionId: string): Promise<SessionDetailResponse> => {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/statistics/sessions/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching session details: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    throw error;
  }
};

// Function to fetch all nightlords
export const fetchNightLords = async (): Promise<NightLord[]> => {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const token = getToken();
    
    const response = await fetch(`${apiBaseUrl}/api/v1/night-lords`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching nightlords: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch nightlords:', error);
    throw error;
  }
};

// Function to fetch all nightfarers
export const fetchNightfarers = async (): Promise<Nightfarer[]> => {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const token = getToken();
    
    const response = await fetch(`${apiBaseUrl}/api/v1/nightfarers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching nightfarers: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch nightfarers:', error);
    throw error;
  }
}; 