import { httpClient } from './http-client';
import { 
  Session, 
  MinimalSession, 
  SessionDetails, 
  CreateSessionParams,
  JoinSessionParams,
  UserSessionResult,
  SessionDto
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
   * Fetch sessions with filters and pagination
   * @param options Filtering and pagination options
   * @returns List of sessions
   */
  async fetchSessions(
    isLoggedIn: boolean,
    currentPage: number = 1,
    limit: number = 10,
    statusFilter: string = 'All'
  ): Promise<{ sessions?: Session[], minimalSessions?: MinimalSession[] }> {
    try {
      const offset = (currentPage - 1) * limit;
      // Add status parameter to only fetch sessions with the current status filter
      const statusParam = statusFilter !== 'All' ? `&status=${statusFilter}` : '';
      
      // Different endpoints based on authentication status
      if (isLoggedIn) {
        // Use authenticated endpoint with full data for logged-in users
        // Always set isPrivate=false to ensure we never show private sessions
        const isPrivateParam = '&isPrivate=false';
        
        const sessions = await this.client.get<Session[]>(
          `/api/v1/sessions?limit=${limit}&offset=${offset}${statusParam}${isPrivateParam}`,
          true
        );
        
        return { sessions };
      } else {
        // Use public endpoint with minimal data for non-authenticated users
        const minimalSessions = await this.client.get<MinimalSession[]>(
          `/api/v1/public/sessions?limit=${limit}&offset=${offset}${statusParam}`,
          false
        );
        
        return { minimalSessions };
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific session
   * @param sessionId Session ID to fetch
   * @returns Session details
   */
  async fetchSessionDetail(sessionId: string): Promise<Session> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    return this.client.get<Session>(`/api/v1/sessions/${sessionId}`, true);
  }

  /**
   * Create a new session
   * @param sessionData Session creation data
   * @returns Created session with ID
   */
  async createSession(sessionData: CreateSessionParams): Promise<{ id: string }> {
    try {
      return await this.client.post<{ id: string }>(
        `/api/v1/sessions`, 
        sessionData, 
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Join an existing session
   * @param sessionId Session ID to join
   * @param joinData Join session data
   */
  async joinSession(
    sessionId: string,
    nightfarer: string,
    userId: string,
    username: string,
    covenantName: string
  ): Promise<void> {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    try {
      const joinData: JoinSessionParams = {
        nightfarer,
        userId,
        username,
        covenantName
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
   * Recreate a session from an existing one
   * @param originalSessionId Original session ID to recreate
   * @returns New session ID
   */
  async recreateSession(originalSessionId: string): Promise<{ id: string }> {
    if (!originalSessionId) {
      throw new Error('Original session ID is required');
    }
    
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
   * @param sessionId Session ID to update
   * @param nightLord Night Lord character
   * @param hostNightfarer Host's Nightfarer character
   */
  async updateSessionCharacters(
    sessionId: string,
    nightLord: string,
    hostNightfarer: string
  ): Promise<void> {
    try {
      await this.client.patch<void>(
        `/api/v1/sessions/${sessionId}`,
        {
          nightLord,
          hostNightfarer
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
  async getActiveSession(): Promise<SessionDto | null> {
    try {
      return await this.client.get<SessionDto | null>(
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
}

// Export a singleton instance
export const sessionService = new SessionService(); 