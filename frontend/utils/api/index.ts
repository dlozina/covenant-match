// Re-export all types from types.ts
export * from './types';

// Re-export all errors from errors.ts
export * from './errors';

// Re-export the HTTP client
export * from './http-client';

// Re-export the services
export { SessionService } from './session-service';
export { UserService } from './user-service';
export { sessionService } from './session-service';
export { StatisticsService } from './statistics-service';

// Import the SessionService class and types needed for our helper functions
import { SessionService } from './session-service';
import { 
  Session, 
  MinimalSession, 
  UserSessionsResponse,
  PaginatedSessionsResponse
} from './types';
import { httpClient } from './http-client';

/**
 * Fetch sessions with authentication-aware behavior
 * @param isLoggedIn Whether the user is logged in
 * @param currentPage Current page number
 * @param limit Number of sessions per page
 * @param statusFilter Filter by session status
 * @param region Filter by region
 * @param platform Filter by platform
 * @param nightLordFilter Filter by Night Lord (optional)
 * @param hostExperienceFilter Filter by host experience level (optional)
 * @returns Paginated list of sessions with metadata
 */
export const fetchSessions = async (
  isLoggedIn: boolean,
  currentPage: number = 1,
  limit: number = 10,
  statusFilter: string = 'All',
  region?: string,
  platform?: string,
  nightLordFilter?: string,
  hostExperienceFilter?: string
): Promise<{
  sessions?: Session[],
  minimalSessions?: MinimalSession[],
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  }
}> => {
  try {
    const offset = (currentPage - 1) * limit;
    const status = statusFilter === 'All' ? undefined : statusFilter;
    
    if (isLoggedIn) {
      // Fetch full session data for authenticated users
      const response = await SessionService.getSessions({
        status,
        limit,
        offset,
        region,
        platform,
        nightLord: nightLordFilter,
        hostExperience: hostExperienceFilter
      });
      
      return { 
        sessions: response.items,
        pagination: {
          currentPage: response.metadata.current_page,
          totalPages: response.metadata.page_count,
          totalItems: response.metadata.totalCount,
          itemsPerPage: response.metadata.per_page
        }
      };
    } else {
      // Fetch minimal session data for unauthenticated users
      const response = await SessionService.getPublicSessions({
        status,
        limit,
        offset,
        region,
        platform,
        nightLord: nightLordFilter,
        hostExperience: hostExperienceFilter
      });
      
      return { 
        minimalSessions: response.items,
        pagination: {
          currentPage: response.metadata.current_page,
          totalPages: response.metadata.page_count,
          totalItems: response.metadata.totalCount,
          itemsPerPage: response.metadata.per_page
        }
      };
    }
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};

/**
 * Fetch sessions created by friends
 * @param currentPage Current page number
 * @param limit Number of sessions per page
 * @param statusFilter Filter by session status
 * @param region Filter by region
 * @param platform Filter by platform
 * @param nightLordFilter Filter by Night Lord (optional)
 * @param hostExperienceFilter Filter by host experience level (optional)
 * @returns Paginated list of sessions created by friends with metadata
 */
export const fetchFriendSessions = async (
  currentPage: number = 1,
  limit: number = 10,
  statusFilter: string = 'All',
  region?: string,
  platform?: string,
  nightLordFilter?: string,
  hostExperienceFilter?: string
): Promise<{
  sessions: Session[],
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }
}> => {
  try {
    const offset = (currentPage - 1) * limit;
    const status = statusFilter === 'All' ? undefined : statusFilter;
    
    const response = await SessionService.getFriendSessions({
      status,
      limit,
      offset,
      region,
      platform,
      nightLord: nightLordFilter,
      hostExperience: hostExperienceFilter
    });
    
    return { 
      sessions: response.data,
      pagination: response.pagination
    };
  } catch (error) {
    console.error('Error fetching friend sessions:', error);
    throw error;
  }
};

/**
 * Fetch user's current and previous sessions
 * @returns Object containing current and previous session data
 */
export const fetchUserSessions = async (): Promise<UserSessionsResponse> => {
  try {
    return await httpClient.get<UserSessionsResponse>('/api/v1/users/sessions', true);
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    throw error;
  }
};

// Session Management
export const createSession = async (sessionData: Record<string, unknown>) => {
  const res = await fetch('/api/v1/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Error creating session');
  }

  return res.json();
};

export const kickPlayer = async (sessionId: string, playerId: string) => {
  const res = await fetch(`/api/v1/sessions/${sessionId}/kick/${playerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Error kicking player');
  }

  return true;
};
