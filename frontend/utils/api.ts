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

// Types for sessions
export interface JoinedPlayer {
  userId: string;
  username: string;
  nightfarer: string;
  joinedAt: string;
}

export interface Session {
  id: string;
  name: string;
  hostId: string;
  status: "Open" | "InProgress" | "Completed";
  nightLord: string;
  joinedPlayers: JoinedPlayer[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  password: string;
}

// Interface for the minimal session data from public endpoint
export interface MinimalSession {
  id: string;
  name: string;
  hostName: string;
  status: "Open" | "InProgress" | "Completed";
  createdAt: string;
}

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

// Function to fetch sessions (for sessions page)
export const fetchSessions = async (
  isLoggedIn: boolean,
  currentPage: number,
  limit: number,
  statusFilter: string
): Promise<{ sessions?: Session[], minimalSessions?: MinimalSession[] }> => {
  try {
    const offset = (currentPage - 1) * limit;
    // Add status parameter to only fetch sessions with the current status filter
    const statusParam = statusFilter !== 'All' ? `&status=${statusFilter}` : '';
    const token = getToken();
    
    // Different endpoints based on authentication status
    if (isLoggedIn && token) {
      // Use authenticated endpoint with full data for logged-in users
      // Always set isPrivate=false to ensure we never show private sessions
      const isPrivateParam = '&isPrivate=false';
      
      const response = await fetch(`${API_URL}/api/v1/sessions?limit=${limit}&offset=${offset}${statusParam}${isPrivateParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      return { sessions: data };
    } else {
      // Use public endpoint with minimal data for non-authenticated users
      const response = await fetch(`${API_URL}/api/v1/public/sessions?limit=${limit}&offset=${offset}${statusParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch public sessions');
      }

      const data = await response.json();
      return { minimalSessions: data };
    }
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    throw error;
  }
};

// Types for session fetching/recreation
export interface SessionDetails {
  id: string;
  name: string;
  nightLord: string;
  password: string | null;
  hostId: string;
  nightfarer?: string;
  joinedPlayers?: { userId: string; username: string; nightfarer: string }[];
}

// Function to fetch detailed information about a specific session
export const fetchSessionDetail = async (sessionId: string | null | undefined): Promise<SessionDetails> => {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }
  
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch session details');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch session details:', error);
    throw error;
  }
};

// Function to recreate a session
export const recreateSession = async (originalSessionId: string | null | undefined): Promise<{ id: string }> => {
  if (!originalSessionId) {
    throw new Error('Original session ID is required');
  }
  
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${originalSessionId}/recreate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to recreate session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to recreate session:', error);
    throw error;
  }
};

// Function to update session characters
export const updateSessionCharacters = async (
  sessionId: string, 
  nightLord: string, 
  hostNightfarer: string
): Promise<void> => {
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nightLord,
        hostNightfarer
      }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to update session characters');
    }
  } catch (error) {
    console.error('Failed to update session characters:', error);
    throw error;
  }
};

// Function to join a session
export const joinSession = async (
  sessionId: string,
  nightfarer: string,
  userId: string,
  username: string,
  covenantName: string,
  region: string
): Promise<void> => {
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nightfarer,
        userId,
        username,
        covenantName,
        region
      }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to join session');
    }
  } catch (error) {
    console.error('Failed to join session:', error);
    throw error;
  }
};

// Function for a player to leave a session
export const leaveSession = async (sessionId: string): Promise<void> => {
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to leave session');
    }
  } catch (error) {
    console.error('Failed to leave session:', error);
    throw error;
  }
};

// Function for a host to cancel/delete a session
export const cancelSession = async (sessionId: string): Promise<void> => {
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to cancel session');
    }
  } catch (error) {
    console.error('Failed to cancel session:', error);
    throw error;
  }
};

// Interface for session creation
export interface CreateSessionParams {
  gamePassword: string;
  name: string;
  nightLord: string;
  nightfarer: string;
  isPrivate: boolean;
  region: string;
}

// Function to create a session
export const createSession = async (
  sessionData: CreateSessionParams
): Promise<{ id: string }> => {
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(sessionData),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to create session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
};

// User-related types
export interface GameData {
  platforms: {
    id: string;
    name: string;
    description: string;
  }[];
  regions: {
    id: string;
    name: string;
    description: string;
  }[];
  covenants: {
    id: string;
    name: string;
    description: string;
  }[];
  nightfarers: {
    id: string;
    name: string;
    description: string;
  }[];
}

export interface LoginParams {
  username: string;
  password: string;
  captchaToken?: string;
}

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  displayName: string;
  region: string;
  platform: string;
  autoRegion: boolean;
  covenantName: string;
}

export interface UpdateProfileParams {
  username?: string;
  email?: string;
  displayName?: string;
  region?: string;
  platform?: string;
  autoRegion?: boolean;
  covenantName?: string;
  preferredSessionName?: string;
  preferredSessionPassword?: string;
  preferredNightfarer?: string;
}

// Login function
export const login = async (loginData: LoginParams): Promise<{ token: string }> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
      credentials: 'include', // Include cookies for CSRF protection
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.requiresCaptcha) {
        const error = new Error(errorData.message || 'CAPTCHA verification required');
        // @ts-expect-error - Adding custom property to Error object
        error.requiresCaptcha = true;
        throw error;
      }
      throw new Error(errorData.message || 'Invalid username or password');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Register (create profile) function
export const register = async (registerData: RegisterParams): Promise<{ token: string }> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

// Update profile function
export const updateProfile = async (profileData: UpdateProfileParams): Promise<Record<string, unknown>> => {
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Profile update failed:', error);
    throw error;
  }
};

// Delete profile function
export const deleteProfile = async (): Promise<void> => {
  try {
    const token = getToken();
    
    const response = await fetch(`${API_URL}/api/v1/users/me`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete profile');
    }
  } catch (error) {
    console.error('Profile deletion failed:', error);
    throw error;
  }
};

// Fetch game data function
export const fetchGameData = async (): Promise<GameData> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/game-data`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch game data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch game data:', error);
    throw error;
  }
}; 