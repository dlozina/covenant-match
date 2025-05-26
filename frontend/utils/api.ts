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
  experience: string;
  joinedAt: string;
}

export interface Session {
  id: string;
  name: string;
  hostId: string;
  status: "Open" | "InProgress" | "Completed";
  nightLord: string;
  isFriendsOnly: boolean;
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
  joinedPlayers: { username: string; experience: string }[];
}

// Types for leaderboard
export interface LeaderboardEntryResponseDto {
  userId: string;
  username: string;
  totalGames: number;
  wins: number;
  winRate: number;
  reputationScore: number;
  score: number;
}

// Types for session history
export interface SessionHistoryEntry {
  session_id: string;
  session_name: string;
  night_lord: string;
  player_nightfarer: string;
  player_result: string;
  consensus_result: string;
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

// Announcement type for site-wide notifications
export interface Announcement {
  active: boolean;
  content: string;
  updatedAt: string | { $date: { $numberLong: string } };
}

// News Types
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  image_url?: string;
  author_id?: string;
  author_username: string;
  updated_by_id?: string;
  updated_by_username?: string;
  published: boolean;
  created_at: string | { $date: { $numberLong: string } };
  updated_at: string | { $date: { $numberLong: string } };
  time_ago?: string;
}

// Types for user statistics
export interface UserStats {
  userId: string;
  username: string;
  platform: string;
  covenantName: string;
  experience: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  score: number;
}

export interface UserStatsResponse {
  status: string;
  data: UserStats[];
  notFoundUsers: string[] | null;
}

// Types for bug reports
export interface BugReport {
  id: string;
  title: string;
  device: string;
  description: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface CreateBugReportDto {
  title: string;
  device: string;
  description: string;
}

export interface BugReportResponse {
  status: string;
  data: {
    id: string;
  };
}

export interface BugReportsResponse {
  status: string;
  data: {
    bugs: BugReport[];
  };
}

export interface BugReportDetailResponse {
  status: string;
  data: {
    bug: BugReport;
  };
}

// Game data interfaces
export interface ExperienceData {
  id: string;
  name: string;
  description: string;
}

// Function to fetch leaderboard data
export const fetchLeaderboard = async (limit?: number): Promise<LeaderboardEntryResponseDto[]> => {
  try {
    const params = limit ? `?limit=${limit}` : '';
    const response = await fetch(`${API_URL}/api/v1/statistics/leaderboard${params}`, {
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
  statusFilter: string,
  region?: string,
  platform?: string,
  nightLordFilter?: string,
  experienceFilter?: string
): Promise<{ sessions?: Session[], minimalSessions?: MinimalSession[] }> => {
  try {
    // For logged-in users, ensure we have region data before proceeding
    // This prevents showing sessions from other regions during refresh
    if (isLoggedIn && !region) {
      console.warn("No region specified for logged-in user when fetching sessions");
      // Return empty data to prevent showing sessions from other regions
      return { sessions: [] };
    }

    const offset = (currentPage - 1) * limit;
    // Format status parameter to match backend expectations (lowercase with underscores)
    const formattedStatus = statusFilter === 'InProgress' ? 'in_progress' : statusFilter.toLowerCase();
    // Add status parameter to only fetch sessions with the current status filter
    const statusParam = statusFilter !== 'All' ? `&status=${formattedStatus}` : '';
    const token = getToken();
    
    // Add region and platform parameters if provided
    const regionParam = region ? `&region=${encodeURIComponent(region)}` : '';
    const platformParam = platform ? `&platform=${encodeURIComponent(platform)}` : '';
    const nightLordParam = nightLordFilter ? `&nightLord=${encodeURIComponent(nightLordFilter)}` : '';
    const experienceParam = experienceFilter ? `&experience=${encodeURIComponent(experienceFilter)}` : '';
    
    // Log API request parameters for debugging
    console.log(`Fetching sessions with params - status: ${formattedStatus}, region: ${region}, platform: ${platform}, nightLord: ${nightLordFilter}, experience: ${experienceFilter}`);
    
    // Different endpoints based on authentication status
    if (isLoggedIn && token) {
      // Use authenticated endpoint with full data for logged-in users
      // Always set isPrivate=false to ensure we never show private sessions
      const isPrivateParam = '&isPrivate=false';
      
      const response = await fetch(`${API_URL}/api/v1/sessions?limit=${limit}&offset=${offset}${statusParam}${isPrivateParam}${regionParam}${platformParam}${nightLordParam}${experienceParam}`, {
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
  joinedPlayers?: { userId: string; username: string; nightfarer: string; experience: string }[];
}

// Extract MongoDB ObjectId helper
const extractMongoId = (id: string | object | null | undefined): string => {
  if (!id) return '';
  
  if (typeof id === 'object') {
    // Check if it's a MongoDB ObjectId format with $oid property
    if (id !== null && '$oid' in id) {
      // @ts-expect-error - We know $oid exists based on the check above
      return id.$oid;
    }
    // Fall back to String() for other object types
    return String(id);
  }
  
  return id;
};

// Function to fetch detailed information about a specific session
export const fetchSessionDetail = async (sessionId: string | object | null | undefined): Promise<SessionDetails> => {
  if (!sessionId) {
    throw new Error('Session ID is required');
  }
  
  try {
    const token = getToken();
    
    // Use helper to extract MongoDB ObjectId
    const sessionIdString = extractMongoId(sessionId);
    console.log('Fetching session with ID:', sessionIdString);
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionIdString}`, {
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

// Function to update session characters
export const updateSessionCharacters = async (
  sessionId: string | object, 
  nightLord: string, 
  hostNightfarer: string
): Promise<void> => {
  try {
    const token = getToken();
    
    // Use helper to extract MongoDB ObjectId
    const sessionIdString = extractMongoId(sessionId);
    console.log('Updating characters for session with ID:', sessionIdString);
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionIdString}`, {
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

// Function to leave a session
export const leaveSession = async (sessionId: string | object): Promise<void> => {
  try {
    const token = getToken();
    
    // Use helper to extract MongoDB ObjectId
    const sessionIdString = extractMongoId(sessionId);
    console.log('Leaving session with ID:', sessionIdString);
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionIdString}/leave`, {
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

// Function to recreate a session
export const recreateSession = async (originalSessionId: string | object | null | undefined): Promise<{ id: string }> => {
  if (!originalSessionId) {
    throw new Error('Original session ID is required');
  }
  
  try {
    const token = getToken();
    
    // Use helper to extract MongoDB ObjectId
    const sessionIdString = extractMongoId(originalSessionId);
    console.log('Recreating session with original ID:', sessionIdString);
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionIdString}/recreate`, {
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

// Function for a host to cancel/delete a session
export const cancelSession = async (sessionId: string | object): Promise<void> => {
  try {
    const token = getToken();
    
    // Use helper to extract MongoDB ObjectId
    const sessionIdString = extractMongoId(sessionId);
    console.log('Cancelling session with ID:', sessionIdString);
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionIdString}/cancel`, {
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
  isFriendsOnly: boolean;
  region: string;
  platform: string;
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
      // todo: we are exposing the error message to the user
      //const data = await response.json();
      throw new Error('Failed to create session');
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
  experiences: {
    id: string;
    name: string;
    description: string;
  }[];
}

export interface LoginParams {
  username: string;
  password: string;
  turnstileToken?: string;
}

export interface RegisterParams {
  username: string;
  email: string;
  password: string;

  region: string;
  platform: string;
  autoRegion: boolean;
  covenantName: string;
  experience: string;
}

export interface UpdateProfileParams {
  username?: string;
  email?: string;
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

// Function to fetch recent news for homepage
export async function fetchRecentNews(limit: number = 5): Promise<NewsItem[]> {
  try {
    const response = await fetch(`${API_URL}/api/v1/news/recent?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from news API:', errorData);
      throw new Error(errorData.message || 'Failed to fetch news');
    }

    const data = await response.json();
    console.log('Recent news API response:', data);
    
    if (data.status === 'success' && data.data && Array.isArray(data.data.news)) {
      return data.data.news;
    } else {
      console.error('Unexpected API response format:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching recent news:', error);
    return [];
  }
}

// Function to fetch a single news item by ID
export async function fetchNewsById(id: string): Promise<NewsItem | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/news/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch news');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching news item:', error);
    return null;
  }
}

// Function to fetch a single news item by ID for admin (includes drafts)
export async function fetchAdminNewsById(id: string): Promise<NewsItem | null> {
  try {
    // Get the authentication token
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`${API_URL}/api/v1/admin/news/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch news item');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching admin news item:', error);
    return null;
  }
}

// Function to fetch paginated news list with search
export async function fetchAllNews(page: number = 1, limit: number = 10, search?: string): Promise<{ news: NewsItem[], total: number, page: number, totalPages: number }> {
  try {
    let url = `${API_URL}/api/v1/news?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
      console.log(`Searching news with term: "${search}"`);
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch news');
    }

    const data = await response.json();
    return {
      news: data.data.news,
      total: data.data.pagination.total,
      page: data.data.pagination.page,
      totalPages: data.data.pagination.total_pages
    };
  } catch (error) {
    console.error('Error fetching news list:', error);
    return { news: [], total: 0, page: 1, totalPages: 0 };
  }
}

// Function to fetch news for admin dashboard (includes drafts)
export async function fetchAdminNews(): Promise<NewsItem[]> {
  try {
    // Get the authentication token
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`${API_URL}/api/v1/admin/news`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch admin news');
    }

    const data = await response.json();
    if (data.status === 'success' && data.data && Array.isArray(data.data.news)) {
      return data.data.news;
    } else {
      console.error('Unexpected API response format:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching admin news:', error);
    return [];
  }
}

// Function to fetch the current announcement
export async function fetchAnnouncement(): Promise<Announcement | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/announcements/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.status === 'success' && data.data) {
      return data.data.announcement;
    }
    return null;
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return null;
  }
}

// Function to update the announcement (admin only)
export async function updateAnnouncement(announcement: Announcement): Promise<boolean> {
  try {
    // Get the authentication token
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Ensure we're sending a properly formatted date string
    let updatedAt = announcement.updatedAt;
    
    // If updated_at is a MongoDB date object, convert it to a string
    if (typeof updatedAt === 'object' && updatedAt !== null && '$date' in updatedAt) {
      // Don't send the MongoDB object format at all - backend handles timestamps
      updatedAt = new Date().toISOString();
    }
    
    const response = await fetch(`${API_URL}/api/v1/admin/announcements`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        active: announcement.active,
        content: announcement.content
        // Don't send updated_at at all - let the backend handle it
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update announcement');
    }

    return true;
  } catch (error) {
    console.error('Error updating announcement:', error);
    return false;
  }
}

// Function to fetch user statistics for multiple users
export const fetchUserStats = async (userIds: string[]): Promise<UserStats[]> => {
  try {
    if (!userIds.length) {
      return [];
    }

    const token = getToken();
    const userIdsParam = userIds.join(',');
    
    const response = await fetch(`${API_URL}/api/v1/statistics/batch?userIds=${userIdsParam}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching user stats: ${response.statusText}`);
    }

    const result: UserStatsResponse = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return []; // Return empty array on error to prevent UI from breaking
  }
};

// Function to create a bug report
export const createBugReport = async (bugReport: CreateBugReportDto): Promise<string> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/api/v1/bugs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bugReport),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to submit bug report');
    }

    const data: BugReportResponse = await response.json();
    return data.data.id;
  } catch (error) {
    console.error('Failed to create bug report:', error);
    throw error;
  }
};

// Function to get all bug reports (admin only)
export const getAllBugReports = async (): Promise<BugReport[]> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/api/v1/bugs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch bug reports');
    }

    const data: BugReportsResponse = await response.json();
    return data.data.bugs;
  } catch (error) {
    console.error('Failed to fetch bug reports:', error);
    throw error;
  }
};

// Function to get a bug report by ID
export const getBugReportById = async (id: string): Promise<BugReport> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/api/v1/bugs/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch bug report');
    }

    const data: BugReportDetailResponse = await response.json();
    return data.data.bug;
  } catch (error) {
    console.error('Failed to fetch bug report:', error);
    throw error;
  }
};

// Function to get current user's bug reports
export const getUserBugReports = async (): Promise<BugReport[]> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/api/v1/bugs/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch your bug reports');
    }

    const data: BugReportsResponse = await response.json();
    return data.data.bugs;
  } catch (error) {
    console.error('Failed to fetch user bug reports:', error);
    throw error;
  }
};

// Function to get bugs reported by a specific user (admin only)
export const getBugReportsByUserId = async (userId: string): Promise<BugReport[]> => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/api/v1/bugs/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch bug reports for this user');
    }

    const data: BugReportsResponse = await response.json();
    return data.data.bugs;
  } catch (error) {
    console.error('Failed to fetch bug reports by user ID:', error);
    throw error;
  }
};

// Function to join a session
export const joinSession = async (
  sessionId: string | object,
  nightfarer: string,
  userId: string,
  username: string,
  covenantName: string,
  region: string,
  platform: string,
  experience: string,
): Promise<void> => {
  try {
    const token = getToken();
    
    // Use helper to extract MongoDB ObjectId
    const sessionIdString = extractMongoId(sessionId);
    console.log('Joining session with ID:', sessionIdString);
    
    const response = await fetch(`${API_URL}/api/v1/sessions/${sessionIdString}/join`, {
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
        region,
        platform,
        experience
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

// Function to fetch experience levels
export const fetchExperienceLevels = async (): Promise<ExperienceData[]> => {
  try {
    const response = await fetch(`${API_URL}/api/v1/game/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching game data: ${response.statusText}`);
    }

    const data = await response.json();
    return data.experiences || [];
  } catch (error) {
    console.error('Failed to fetch experience levels:', error);
    throw error;
  }
}; 