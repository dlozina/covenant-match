// Common types

// Session-related types
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
  isFriendsOnly: boolean;
  nightLord: string;
  joinedPlayers: JoinedPlayer[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  password: string;
}

export interface MinimalSession {
  id: string;
  name: string;
  hostName: string;
  status: "Open" | "InProgress" | "Completed";
  createdAt: string;
  nightLord?: string;
  hostExperience?: string;
  playerCount?: number;
  isFriendsOnly?: boolean;
}

export interface SessionDetails {
  id: string;
  name: string;
  nightLord: string;
  password: string | null;
  hostId: string;
  nightfarer?: string;
  joinedPlayers?: JoinedPlayer[];
}

// Auth-related types
export interface LoginParams {
  username: string;
  password: string;
  captchaToken?: string;
}

export interface LoginResponse {
  token: string;
  user?: {
    id: string;
    username: string;
  };
}

// User-related types
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
  experience?: string;
  preferredSessionName?: string;
  preferredSessionPassword?: string;
  preferredNightfarer?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  region: string;
  platform: string;
  autoRegion: boolean;
  covenantName: string;
  experience?: string;
  preferredSessionName?: string;
  preferredSessionPassword?: string;
  preferredNightfarer?: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

// Game data types
export interface PlatformData {
  id: string;
  name: string;
  description: string;
}

export interface RegionData {
  id: string;
  name: string;
  description: string;
}

export interface CovenantData {
  id: string;
  name: string;
  description: string;
}

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

export interface ExperienceData {
  id: string;
  name: string;
  description: string;
}

export interface GameData {
  platforms: PlatformData[];
  regions: RegionData[];
  covenants: CovenantData[];
  nightfarers: Nightfarer[];
  nightLords?: NightLord[];
  experiences?: ExperienceData[];
}

// Session creation/management types
export interface CreateSessionParams {
  gamePassword: string;
  name: string;
  nightLord: string;
  nightfarer: string;
  isPrivate: boolean;
  region: string;
}

export interface JoinSessionParams {
  nightfarer: string;
  userId: string;
  username: string;
  covenantName: string;
  region: string;
}

// Statistics types
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_games: number;
  wins: number;
  win_rate: number;
  reputation_score: number;
  score: number;
}

export interface SessionHistoryEntry {
  session_id: string;
  session_name: string;
  night_lord: string;
  player_nightfarer: string;
  player_result: string;
  created_at: string;
  completed_at: string | null;
}

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

// User sessions response type for the GET /api/v1/users/sessions endpoint
export type SessionRating = Record<string, never>;

export interface UserSessionsResponse {
  previousSession: {
    id: string;
    name: string;
    hostId: string;
    region: string;
    platform: string;
    password: string;
    isPrivate: boolean;
    isFriendsOnly: boolean;
    nightLord: string;
    status: string;
    joinedPlayers: Array<{
      userId: string;
      username: string;
      nightfarer: string;
      covenantName: string;
      region: string;
      platform: string;
      experience: string;
      joinedAt: {
        $date: {
          $numberLong: string;
        }
      };
    }>;
    results: Array<{
      userId: string;
      result: string;
      rating: number;
      feedback: string;
      submittedAt: {
        $date: {
          $numberLong: string;
        }
      };
    }>;
    ratings: SessionRating[];
    createdAt: {
      $date: {
        $numberLong: string;
      }
    };
    updatedAt: {
      $date: {
        $numberLong: string;
      }
    };
    startedAt: {
      $date: {
        $numberLong: string;
      }
    } | null;
    completedAt: {
      $date: {
        $numberLong: string;
      }
    } | null;
    statsUpdated: boolean;
    newSessionCreated: boolean;
    newSessionCreatedId: string | null;
  } | null;
  
  currentSession: {
    id: string;
    name: string;
    hostId: string;
    region: string;
    platform: string;
    password: string;
    isPrivate: boolean;
    isFriendsOnly: boolean;
    nightLord: string;
    status: string;
    joinedPlayers: Array<{
      userId: string;
      username: string;
      nightfarer: string;
      covenantName: string;
      region: string;
      platform: string;
      experience: string;
      joinedAt: {
        $date: {
          $numberLong: string;
        }
      };
    }>;
    results: Array<{
      userId: string;
      result: string;
      rating: number;
      feedback: string;
      submittedAt: {
        $date: {
          $numberLong: string;
        }
      };
    }>;
    ratings: SessionRating[];
    createdAt: {
      $date: {
        $numberLong: string;
      }
    };
    updatedAt: {
      $date: {
        $numberLong: string;
      }
    };
    startedAt: {
      $date: {
        $numberLong: string;
      }
    } | null;
    completedAt: {
      $date: {
        $numberLong: string;
      }
    } | null;
    statsUpdated: boolean;
    newSessionCreated: boolean;
    newSessionCreatedId: string | null;
  } | null;
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

// Statistics response types
export interface ActiveSessionsResponse {
  status: string;
  data: {
    count: number;
  };
}

export interface SessionsStatsResponse {
  status: string;
  data: {
    count: number;
  };
}

export interface CovenantStats {
  covenantName: string;
  wins: number;
  losses: number;
  disconnects: number;
}

export interface CovenantStatsResponse {
  covenantStats: CovenantStats[];
}

// Game result type
export interface UserSessionResult {
  sessionId: string;
  userId: string;
  result: string;
  score: number;
  submittedAt: string;
}

/**
 * Friend data from the API
 */
export interface Friend {
  id: string;
  username: string;
  avatarUrl?: string;
  covenantName: string;
  platform: string;
  region: string;
}

/**
 * Friend list response from the API
 */
export interface FriendList {
  friends: Friend[];
  total: number;
}

// Filtering options
export interface SessionFilterOptions {
  status?: string;
  limit?: number;
  offset?: number;
  isPrivate?: boolean;
  region?: string;
  platform?: string;
  nightLord?: string;
  hostExperience?: string;
}

// Use existing Session type as SessionResponse
export type SessionResponse = Session;

export interface UserStats {
  userId: string;
  platform: string;
  experience: string;
  covenantName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  score: number;
}

// Add new pagination response type for sessions
export interface PaginatedSessionsResponse<T> {
  items: T[];
  metadata: {
    totalCount: number;
    pageCount: number;
    currentPage: number;
    perPage: number;
  }
} 