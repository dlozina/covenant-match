import { httpClient } from './http-client';

export interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginAttempt {
  id: string;
  username: string;
  ipAddress: string;
  createdAt: string;
  successful: boolean;
}

export interface LoginAttemptsResponse {
  status: string;
  data: {
    loginAttempts: LoginAttempt[];
    pagination: PaginationResponse;
  };
}

export class AdminService {
  private client = httpClient;

  /**
   * Fetch login attempts with pagination and filtering
   * @param page Current page number (1-indexed)
   * @param limit Number of items per page
   * @param username Optional username filter
   * @param status Optional status filter (true for successful, false for failed)
   * @returns Paginated list of login attempts
   */
  async fetchLoginAttempts(
    page: number = 1,
    limit: number = 20,
    username?: string,
    status?: boolean
  ): Promise<LoginAttemptsResponse> {
    try {
      let url = `/api/v1/admin/login-attempts?page=${page}&limit=${limit}`;
      
      if (username) {
        url += `&username=${encodeURIComponent(username)}`;
      }
      
      if (status !== undefined) {
        url += `&status=${status}`;
      }
      
      return await this.client.get<LoginAttemptsResponse>(url, true);
    } catch (error) {
      throw error;
    }
  }
}

// Export a singleton instance
export const adminService = new AdminService(); 