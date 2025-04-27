import { httpClient } from './http-client';
import { AdminSession, SessionsPaginationResponse } from '@/components/admin/AdminSessionsClient';
import { 
  AdminSessionDto, 
  AdminSessionsResponseDto, 
  AdminSessionResponseDto,
  SessionStatus
} from '@/utils/dto/admin-session.dto';

// Define the frontend response types
interface AdminSessionsFrontendResponse {
  status: string;
  data: {
    sessions: AdminSession[];
    pagination: SessionsPaginationResponse;
  };
}

interface AdminSessionFrontendResponse {
  status: string;
  data: AdminSession;
}

export class AdminSessionService {
  /**
   * Get sessions with pagination (admin only)
   * @param page Current page number (starting from 1)
   * @param limit Number of items per page
   * @param status Optional status filter
   * @returns Paginated list of sessions
   */
  static async getSessions(
    page: number = 1,
    limit: number = 20,
    status?: string | null
  ): Promise<AdminSessionsFrontendResponse> {
    try {
      let url = `/api/v1/admin/sessions?page=${page}&limit=${limit}`;
      if (status) {
        url += `&status=${status}`;
      }
      
      // Use the DTO type for the API response
      const response = await httpClient.get<AdminSessionsResponseDto>(url, true);
      
      // Transform the API response to the AdminSession format
      // Now the backend already sends camelCase, so we just need to map directly
      const transformedSessions = response.data.sessions.map((session: AdminSessionDto) => ({
        id: session.id,
        name: session.name,
        hostId: session.hostId,
        status: session.status,
        nightLord: session.nightLord,
        joinedPlayers: session.joinedPlayers.map((player) => ({
          userId: player.userId,
          username: player.username,
          nightfarer: player.nightfarer,
          covenantName: player.covenantName,
          region: player.region,
          platform: player.platform,
          joinedAt: player.joinedAt
        })),
        region: session.region,
        platform: session.platform,
        isPrivate: session.isPrivate,
        password: session.password,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        statsUpdated: session.statsUpdated,
        results: session.results.map((result) => ({
          userId: result.userId,
          result: result.result,
          rating: result.rating,
          feedback: result.feedback,
          submittedAt: result.submittedAt
        }))
      }));
      
      return {
        status: response.status,
        data: {
          sessions: transformedSessions,
          pagination: response.data.pagination
        }
      };
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      throw error;
    }
  }

  /**
   * Get a specific session by ID (admin only)
   * @param sessionId Session ID to fetch
   * @returns Session data
   */
  static async getSession(sessionId: string): Promise<AdminSessionFrontendResponse> {
    try {
      // Validate session ID
      if (!sessionId || sessionId === 'undefined') {
        throw new Error('Invalid session ID provided');
      }
      
      const response = await httpClient.get<AdminSessionResponseDto>(`/api/v1/admin/sessions/${sessionId}`, true);
      
      // Transform the API response to match the AdminSession format
      // Now using direct mapping with camelCase fields
      const transformedSession: AdminSession = {
        id: response.data.id,
        name: response.data.name,
        hostId: response.data.hostId,
        status: response.data.status,
        nightLord: response.data.nightLord,
        joinedPlayers: response.data.joinedPlayers.map((player) => ({
          userId: player.userId,
          username: player.username,
          nightfarer: player.nightfarer,
          covenantName: player.covenantName,
          region: player.region,
          platform: player.platform,
          joinedAt: player.joinedAt
        })),
        region: response.data.region,
        platform: response.data.platform,
        isPrivate: response.data.isPrivate,
        password: response.data.password,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
        startedAt: response.data.startedAt,
        completedAt: response.data.completedAt,
        statsUpdated: response.data.statsUpdated,
        results: response.data.results.map((result) => ({
          userId: result.userId,
          result: result.result,
          rating: result.rating,
          feedback: result.feedback,
          submittedAt: result.submittedAt
        }))
      };
      
      return {
        status: response.status,
        data: transformedSession
      };
    } catch (error) {
      console.error(`Failed to fetch session with ID ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a session (admin only)
   * @param sessionId ID of the session to delete
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      await httpClient.delete<void>(`/api/v1/admin/sessions/${sessionId}`, true);
    } catch (error) {
      console.error(`Failed to delete session with ID ${sessionId}:`, error);
      throw error;
    }
  }
} 