// Define API URL
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

// Types for leaderboard
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_games: number;
  wins: number;
  win_rate: number;
  reputation_score: number;
}

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

// Types for active sessions
export interface ActiveSessionsResponse {
  status: string;
  data: {
    count: number;
  };
}

// Types for sessions stats
export interface SessionsStatsResponse {
  status: string;
  data: {
    count: number;
  };
}

// Types for covenant stats
export interface CovenantStats {
  covenantName: string;
  wins: number;
  losses: number;
  disconnects: number;
}

export interface CovenantStatsResponse {
  covenantStats: CovenantStats[];
}

// Function to fetch leaderboard data
export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/statistics/leaderboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching leaderboard data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch leaderboard data:', error);
    return []; // Return empty array on error to prevent UI from breaking
  }
};

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
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/night-lords`, {
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
    const token = getToken();
    const response = await fetch(`${API_URL}/api/v1/nightfarers`, {
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

// Function to fetch active sessions count
export const fetchActiveSessionsCount = async (): Promise<number> => {
  try {
    const token = getToken();
    console.log('Fetching active sessions count...');
    
    const response = await fetch(`${API_URL}/api/v1/statistics/active-sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Active sessions response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Error fetching active sessions count: ${response.statusText}`);
    }

    const data: ActiveSessionsResponse = await response.json();
    console.log('Active sessions data:', data);
    return data.data.count;
  } catch (error) {
    console.error('Failed to fetch active sessions count:', error);
    return 0; // Return 0 on error to prevent UI from breaking
  }
};

// Function to fetch sessions count by status
export const fetchSessionsCount = async (status?: string): Promise<number> => {
  try {
    const token = getToken();
    
    // Build URL with optional status parameter
    const url = status 
      ? `${API_URL}/api/v1/statistics/sessions-stats?status=${encodeURIComponent(status)}`
      : `${API_URL}/api/v1/statistics/sessions-stats`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching sessions count: ${response.statusText}`);
    }

    const data: SessionsStatsResponse = await response.json();
    return data.data.count;
  } catch {
    return 0; // Return 0 on error to prevent UI from breaking
  }
};

// Function to fetch covenant stats
export const fetchCovenantStats = async (): Promise<CovenantStatsResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/statistics/covenants`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching covenant stats: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch covenant stats:', error);
    return { covenantStats: [] }; // Return empty array on error to prevent UI from breaking
  }
}; 