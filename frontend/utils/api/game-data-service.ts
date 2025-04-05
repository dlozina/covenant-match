import { httpClient } from './http-client';
import { 
  GameData, 
  NightLord, 
  Nightfarer,
  LeaderboardEntry,
  SessionHistoryEntry,
  SessionDetailResponse,
  PaginatedResponse,
  PaginatedSessionHistory,
  CovenantStatsResponse
} from './types';

// Simple in-memory cache for game data
let gameDataCache: GameData | null = null;
let nightLordsCache: NightLord[] | null = null;
let nightfarersCache: Nightfarer[] | null = null;

export class GameDataService {
  /**
   * Get all game data
   * Uses caching to avoid unnecessary API calls
   * @param forceRefresh Whether to force a refresh from the server
   * @returns All game data
   */
  static async getGameData(forceRefresh = false): Promise<GameData> {
    try {
      if (!gameDataCache || forceRefresh) {
        gameDataCache = await httpClient.get<GameData>('/api/v1/game-data', false);
      }
      return gameDataCache;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all night lords
   * Uses caching to avoid unnecessary API calls
   * @param forceRefresh Whether to force a refresh from the server
   * @returns List of night lords
   */
  static async getNightLords(forceRefresh = false): Promise<NightLord[]> {
    try {
      if (!nightLordsCache || forceRefresh) {
        nightLordsCache = await httpClient.get<NightLord[]>('/api/v1/night-lords', true);
      }
      return nightLordsCache;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all nightfarers
   * Uses caching to avoid unnecessary API calls
   * @param forceRefresh Whether to force a refresh from the server
   * @returns List of nightfarers
   */
  static async getNightfarers(forceRefresh = false): Promise<Nightfarer[]> {
    try {
      if (!nightfarersCache || forceRefresh) {
        nightfarersCache = await httpClient.get<Nightfarer[]>('/api/v1/nightfarers', true);
      }
      return nightfarersCache;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear all caches
   * Useful when logging out or when data needs to be refreshed
   */
  static clearCaches(): void {
    gameDataCache = null;
    nightLordsCache = null;
    nightfarersCache = null;
  }

  /**
   * Get the leaderboard
   * @returns Leaderboard entries
   */
  static async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      return await httpClient.get<LeaderboardEntry[]>('/api/v1/statistics/leaderboard', false);
    } catch (error) {
      console.error('Failed to fetch leaderboard data:', error);
      return []; // Return empty array on error to prevent UI from breaking
    }
  }

  /**
   * Get the user's session history
   * @returns Session history entries
   */
  static async getUserSessionHistory(): Promise<SessionHistoryEntry[]> {
    try {
      return await httpClient.get<SessionHistoryEntry[]>('/api/v1/statistics/users/me/sessions', true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the user's session history with pagination
   * @param page Page number (0-indexed)
   * @param limit Number of entries per page
   * @returns Paginated session history
   */
  static async getUserSessionHistoryPaginated(
    page: number = 0,
    limit: number = 10
  ): Promise<PaginatedResponse<PaginatedSessionHistory>> {
    try {
      // Backend uses 1-indexed, so we add 1 to the page number
      const response = await httpClient.get<PaginatedResponse<PaginatedSessionHistory>>(
        `/api/v1/statistics/users/me/sessions/paginated?page=${page + 1}&limit=${limit}`,
        true
      );
      
      // Convert backend 1-indexed page to frontend 0-indexed
      if (response.data && response.data.pagination) {
        response.data.pagination.page -= 1;
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get details about a specific session
   * @param sessionId Session ID
   * @returns Session details
   */
  static async getSessionDetails(sessionId: string): Promise<SessionDetailResponse> {
    try {
      return await httpClient.get<SessionDetailResponse>(`/api/v1/statistics/sessions/${sessionId}`, true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the count of active sessions
   * @returns Count of active sessions
   */
  static async getActiveSessionsCount(): Promise<number> {
    try {
      const response = await httpClient.get<{ status: string; data: { count: number } }>(
        '/api/v1/statistics/active-sessions',
        true
      );
      return response.data.count;
    } catch (error) {
      console.error('Failed to fetch active sessions count:', error);
      return 0; // Return 0 on error to prevent UI from breaking
    }
  }

  /**
   * Get the count of sessions by status
   * @param status Optional status filter
   * @returns Count of sessions
   */
  static async getSessionsCount(status?: string): Promise<number> {
    try {
      // Build URL with optional status parameter
      const url = status 
        ? `/api/v1/statistics/sessions-stats?status=${encodeURIComponent(status)}`
        : '/api/v1/statistics/sessions-stats';
      
      const response = await httpClient.get<{ status: string; data: { count: number } }>(url, true);
      return response.data.count;
    } catch (error) {
      return 0; // Return 0 on error to prevent UI from breaking
    }
  }

  /**
   * Get covenant statistics
   * @returns Covenant statistics
   */
  static async getCovenantStats(): Promise<CovenantStatsResponse> {
    try {
      return await httpClient.get<CovenantStatsResponse>('/api/v1/statistics/covenants', false);
    } catch (error) {
      console.error('Failed to fetch covenant stats:', error);
      return { covenantStats: [] }; // Return empty array on error to prevent UI from breaking
    }
  }
} 