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