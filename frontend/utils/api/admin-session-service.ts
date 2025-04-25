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
      
      // Transform the API response to match the AdminSession format
      const transformedSessions = response.data.sessions.map((session: AdminSessionDto) => ({
        id: session._id.$oid,
        name: session.name,
        hostId: session.host_id,
        status: session.status,
        nightLord: session.night_lord,
        joinedPlayers: session.joined_players.map((player) => ({
          userId: player.userId,
          username: player.username,
          nightfarer: player.nightfarer,
          covenantName: player.covenantName,
          region: player.region,
          platform: player.platform,
          joinedAt: player.joinedAt.$date.$numberLong
        })),
        region: session.region,
        platform: session.platform,
        isPrivate: session.is_private,
        password: session.password,
        createdAt: session.created_at.$date.$numberLong,
        updatedAt: session.updated_at.$date.$numberLong,
        startedAt: session.started_at ? session.started_at.$date.$numberLong : null,
        completedAt: session.completed_at ? session.completed_at.$date.$numberLong : null,
        statsUpdated: session.stats_updated,
        results: session.results.map((result) => ({
          userId: result.userId,
          result: result.result,
          rating: result.rating,
          feedback: result.feedback,
          submittedAt: result.submittedAt.$date.$numberLong
        }))
      }));
      
      // Transform pagination
      const transformedPagination: SessionsPaginationResponse = {
        total: response.data.pagination.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        totalPages: response.data.pagination.totalPages
      };
      
      return {
        status: response.status,
        data: {
          sessions: transformedSessions,
          pagination: transformedPagination
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
      const transformedSession: AdminSession = {
        id: response.data._id.$oid,
        name: response.data.name,
        hostId: response.data.host_id,
        status: response.data.status,
        nightLord: response.data.night_lord,
        joinedPlayers: response.data.joined_players.map((player) => ({
          userId: player.userId,
          username: player.username,
          nightfarer: player.nightfarer,
          covenantName: player.covenantName,
          region: player.region,
          platform: player.platform,
          joinedAt: player.joinedAt.$date.$numberLong
        })),
        region: response.data.region,
        platform: response.data.platform,
        isPrivate: response.data.is_private,
        password: response.data.password,
        createdAt: response.data.created_at.$date.$numberLong,
        updatedAt: response.data.updated_at.$date.$numberLong,
        startedAt: response.data.started_at ? response.data.started_at.$date.$numberLong : null,
        completedAt: response.data.completed_at ? response.data.completed_at.$date.$numberLong : null,
        statsUpdated: response.data.stats_updated,
        results: response.data.results.map((result) => ({
          userId: result.userId,
          result: result.result,
          rating: result.rating,
          feedback: result.feedback,
          submittedAt: result.submittedAt.$date.$numberLong
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