import { httpClient } from './http-client';
import {
  Session,
  MinimalSession,
  //JoinedPlayer,
  CreateSessionParams,
  JoinSessionParams,
  UserSessionResult,
  SessionFilterOptions,
  //SessionResponse,
  PaginatedSessionsResponse
} from './types';
import { ApiError } from './errors';

// Legacy functions from sessions.ts to be moved into service methods
export async function fetchAvailableSessions(): Promise<Session[]> {
  return httpClient.get<Session[]>('/sessions?status=open');
}

export async function createLegacySession(sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
  return httpClient.post<Session>('/sessions', sessionData);
}

export async function joinLegacySession(sessionId: string, userData: { userId: string; character: string }): Promise<Session> {
  return httpClient.post<Session>(`/sessions/${sessionId}/join`, {
    user_id: userData.userId,
    nightfarer: userData.character
  }, true);
}

export async function submitResult(sessionId: string, resultData: Omit<UserSessionResult, 'submittedAt'>): Promise<void> {
  return httpClient.post<void>(`/sessions/${sessionId}/results`, resultData);
}

export async function getSessionById(sessionId: string): Promise<Session> {
  return httpClient.get<Session>(`/sessions/${sessionId}`);
}

export async function startSession(sessionId: string): Promise<Session> {
  return httpClient.post<Session>(`/sessions/${sessionId}/start`, {});
}

export class SessionService {
  private client = httpClient;
  
  /**
   * Fetch all sessions with filtering option
   * @param isLoggedIn Whether the user is logged in
   * @param currentPage Current page number (1-indexed)
   * @param limit Number of items per page
   * @param statusFilter Filter by status
   * @param region Filter by player region
   * @param platform Filter by player platform
   * @returns List of sessions
   */
  async fetchSessions(
    isLoggedIn: boolean,
    currentPage: number = 1,
    limit: number = 10,
    statusFilter: string = 'All',
    region?: string,
    platform?: string
  ): Promise<{ sessions?: Session[], minimalSessions?: MinimalSession[] }> {
    try {
      let url = `/api/v1/sessions?page=${currentPage}&limit=${limit}`;
      
      // Add status filter if it's not "All"
      if (statusFilter !== 'All') {
        url += `&status=${statusFilter}`;
      }
      
      // Add region and platform filters if provided
      if (region) {
        url += `&region=${encodeURIComponent(region)}`;
      }
      
      if (platform) {
        url += `&platform=${encodeURIComponent(platform)}`;
      }
      
      if (isLoggedIn) {
        // For logged-in users, we can fetch full session data
        const response = await this.client.get<Session[]>(url, true);
        return { sessions: response };
      } else {
        // For non-logged-in users, fetch minimal session data
        const response = await this.client.get<MinimalSession[]>(url, false);
        return { minimalSessions: response };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch a session by ID
   * @param sessionId Session ID
   * @returns Session data
   */
  async fetchSessionDetail(sessionId: string): Promise<Session> {
    try {
      return await this.client.get<Session>(
        `/api/v1/sessions/${sessionId}`,
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new session
   * @param sessionData Session data
   * @returns Session ID
   */
  async createSession(sessionData: CreateSessionParams): Promise<{ id: string }> {
    try {
      return await this.client.post<{ id: string }>(
        '/api/v1/sessions',
        sessionData,
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Join a session
   * @param sessionId Session ID
   * @param nightfarer Night Farer character
   * @param userId User ID
   * @param username Username
   * @param covenantName Covenant name
   * @param region User region
   */
  async joinSession(
    sessionId: string,
    nightfarer: string,
    userId: string,
    username: string,
    covenantName: string,
    region: string
  ): Promise<void> {
    try {
      const joinData: JoinSessionParams = {
        nightfarer,
        userId,
        username,
        covenantName,
        region
      };
      
      await this.client.post<void>(
        `/api/v1/sessions/${sessionId}/join`,
        joinData,
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Recreate a session with the same players
   * @param originalSessionId Original session ID
   * @returns New session ID
   */
  async recreateSession(originalSessionId: string): Promise<{ id: string }> {
    try {
      return await this.client.post<{ id: string }>(
        `/api/v1/sessions/${originalSessionId}/recreate`,
        {},
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update session characters
   * @param sessionId Session ID
   * @param nightLord Night Lord character
   * @param hostNightfarer Host's Night Farer character
   */
  async updateSessionCharacters(
    sessionId: string,
    nightLord: string,
    hostNightfarer: string
  ): Promise<void> {
    try {
      await this.client.put<void>(
        `/api/v1/sessions/${sessionId}/characters`,
        {
          nightLord,
          nightfarer: hostNightfarer
        },
        true
      );
    } catch (error) {
      throw error;
    }
  }

  // Methods from the old sessions.ts file, refactored to use HttpClient
  async fetchAvailableSessions(): Promise<Session[]> {
    return this.client.get<Session[]>('/sessions?status=open');
  }

  async createLegacySession(sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
    return this.client.post<Session>('/sessions', sessionData);
  }

  async joinLegacySession(sessionId: string, userData: { userId: string; character: string }): Promise<Session> {
    return this.client.post<Session>(`/sessions/${sessionId}/join`, {
      user_id: userData.userId,
      nightfarer: userData.character
    }, true);
  }

  async submitResult(sessionId: string, resultData: Omit<UserSessionResult, 'submittedAt'>): Promise<void> {
    return this.client.post<void>(`/sessions/${sessionId}/results`, resultData);
  }

  async getSessionById(sessionId: string): Promise<Session> {
    return this.client.get<Session>(`/sessions/${sessionId}`);
  }

  async startSession(sessionId: string): Promise<Session> {
    return this.client.post<Session>(`/sessions/${sessionId}/start`, {});
  }

  /**
   * Get the current user's active session if any
   * @returns The active session or null if none
   */
  async getActiveSession(): Promise<Session | null> {
    try {
      return await this.client.get<Session | null>(
        '/api/v1/sessions/active',
        true
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Not logged in, so no active session
        return null;
      }
      throw error;
    }
  }

  /**
   * Get friends sessions
   * @param options Optional filter parameters 
   * @returns List of session objects with pagination metadata
   */
  static async getFriendSessions(options: SessionFilterOptions = {}): Promise<PaginatedSessionsResponse<Session>> {
    try {
      const queryParams = new URLSearchParams();
      if (options.status) queryParams.append('status', options.status);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.isPrivate !== undefined) queryParams.append('isPrivate', options.isPrivate.toString());
      if (options.region) queryParams.append('region', options.region);
      if (options.platform) queryParams.append('platform', options.platform);
      if (options.nightLord && options.nightLord !== 'All') queryParams.append('nightLord', options.nightLord);
      if (options.hostExperience && options.hostExperience !== 'All') queryParams.append('hostExperience', options.hostExperience);

      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return await httpClient.get<PaginatedSessionsResponse<Session>>(`/api/v1/sessions/friends${query}`, true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get sessions for authenticated users
   * @param options Optional filter parameters 
   * @returns List of full session objects with pagination metadata
   */
  static async getSessions(options: SessionFilterOptions = {}): Promise<PaginatedSessionsResponse<Session>> {
    try {
      const queryParams = new URLSearchParams();
      if (options.status) queryParams.append('status', options.status);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.isPrivate !== undefined) queryParams.append('isPrivate', options.isPrivate.toString());
      if (options.region) queryParams.append('region', options.region);
      if (options.platform) queryParams.append('platform', options.platform);
      if (options.nightLord && options.nightLord !== 'All') queryParams.append('nightLord', options.nightLord);
      if (options.hostExperience && options.hostExperience !== 'All') queryParams.append('hostExperience', options.hostExperience);

      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return await httpClient.get<PaginatedSessionsResponse<Session>>(`/api/v1/sessions${query}`, true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get sessions for unauthenticated users (public view with limited data)
   * @param options Optional filter parameters 
   * @returns List of minimal session objects with pagination metadata
   */
  static async getPublicSessions(options: SessionFilterOptions = {}): Promise<PaginatedSessionsResponse<MinimalSession>> {
    try {
      const queryParams = new URLSearchParams();
      if (options.status) queryParams.append('status', options.status);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());
      if (options.isPrivate !== undefined) queryParams.append('isPrivate', options.isPrivate.toString());
      if (options.region) queryParams.append('region', options.region);
      if (options.platform) queryParams.append('platform', options.platform);
      if (options.nightLord && options.nightLord !== 'All') queryParams.append('nightLord', options.nightLord);
      if (options.hostExperience && options.hostExperience !== 'All') queryParams.append('hostExperience', options.hostExperience);

      const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return await httpClient.get<PaginatedSessionsResponse<MinimalSession>>(`/api/v1/public/sessions${query}`, false);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel a session
   * @param sessionId Session ID
   */
  async cancelSession(sessionId: string): Promise<void> {
    try {
      await this.client.post<void>(
        `/api/v1/sessions/${sessionId}/cancel`,
        {},
        true
      );
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Kick a player from a session
   * @param sessionId Session ID
   * @param playerId ID of the player to kick
   */
  async kickPlayer(sessionId: string, playerId: string): Promise<void> {
    try {
      await this.client.post<void>(
        `/api/v1/sessions/${sessionId}/kick/${playerId}`,
        {},
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Kick a player from a session (static method)
   * @param sessionId Session ID
   * @param playerId ID of the player to kick
   * @returns Promise that resolves when the player is successfully kicked
   */
  static async kickPlayer(sessionId: string, playerId: string): Promise<void> {
    try {
      await httpClient.post<void>(
        `/api/v1/sessions/${sessionId}/kick/${playerId}`,
        {},
        true
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to kick player', 500);
    }
  }

  /**
   * Get friendship matrix for a session
   * @param sessionId Session ID
   * @returns Friendship matrix data showing friend relationships between players
   */
  static async getFriendshipMatrix(sessionId: string): Promise<{
    players: Array<{
      id: string;
      username: string;
      isFriendsWith: string[];
      friendRequestSent: string[];
    }>
  }> {
    try {
      return await httpClient.get<{
        players: Array<{
          id: string;
          username: string;
          isFriendsWith: string[];
          friendRequestSent: string[];
        }>
      }>(`/api/v1/sessions/${sessionId}/friendship-matrix`, true);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch friendship matrix', 500);
    }
  }
}

// Export a singleton instance
export const sessionService = new SessionService(); 