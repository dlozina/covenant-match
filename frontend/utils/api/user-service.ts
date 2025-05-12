import { httpClient } from './http-client';
import { FriendList, UserProfile, UpdateProfileParams } from './types';

// Define the types for friend requests
export interface FriendRequestResponse {
  id: string;
  sender: {
    id: string;
    username: string;
    platform: string;
  };
  receiver: {
    id: string;
    username: string;
    platform: string;
  };
  status: string;
  createdAt: string;
}

export interface PaginatedFriendRequests {
  requests: FriendRequestResponse[];
  total: number;
  page: number;
  per_page: number;
}

export interface PendingRequestsResponse {
  has_pending_requests: boolean;
}

export class UserService {
  /**
   * Get the current user's profile
   * @returns User profile data
   */
  static async getCurrentUser(): Promise<UserProfile> {
    try {
      return await httpClient.get<UserProfile>('/api/v1/users/me', true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update the current user's profile
   * @param profileData Updated profile data
   * @returns Updated user profile
   */
  static async updateProfile(profileData: UpdateProfileParams): Promise<UserProfile> {
    try {
      return await httpClient.put<UserProfile>('/api/v1/users/me', profileData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete the current user's profile
   */
  static async deleteProfile(): Promise<void> {
    try {
      await httpClient.delete<void>('/api/v1/users/me');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a user by ID
   * @param userId User ID to fetch
   * @returns User profile data
   */
  static async getUserById(userId: string): Promise<UserProfile> {
    try {
      return await httpClient.get<UserProfile>(`/api/v1/users/${userId}`, true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a username is available
   * @param username Username to check
   * @returns Whether the username is available
   */
  static async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const response = await httpClient.get<{ available: boolean }>(
        `/api/v1/users/check-username?username=${encodeURIComponent(username)}`,
        false
      );
      return response.available;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the current user's friend list
   * @param page Page number (starting from 1)
   * @param limit Number of items per page
   * @returns List of friends with pagination
   */
  static async getFriendList(page: number = 1, limit: number = 10): Promise<FriendList> {
    try {
      return await httpClient.get<FriendList>(`/api/v1/friends?page=${page}&limit=${limit}`, true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove a friend from the current user's friend list
   * @param friendId ID of the friend to remove
   */
  static async removeFriend(friendId: string): Promise<void> {
    try {
      await httpClient.delete<void>(`/api/v1/friends/${friendId}`, true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a friend request to another user
   * @param receiverId ID of the user to send the request to
   * @returns Friend request response
   */
  static async sendFriendRequest(receiverId: string): Promise<FriendRequestResponse> {
    try {
      return await httpClient.post<FriendRequestResponse>(
        '/api/v1/friend-requests',
        { receiver_id: receiverId },
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check friend status for multiple users at once
   * @param userIds Array of user IDs to check
   * @returns Friend status information
   */
  static async checkFriendStatus(userIds: string[]): Promise<{
    friends: string[];
    outgoing_requests: string[];
    incoming_requests: string[];
  }> {
    try {
      return await httpClient.post<{
        friends: string[];
        outgoing_requests: string[];
        incoming_requests: string[];
      }>(
        '/api/v1/friends/check-status',
        { user_ids: userIds },
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all friend requests (both incoming and outgoing)
   * @returns Friend requests data
   */
  static async getAllFriendRequests(): Promise<{
    incoming: FriendRequestResponse[];
    outgoing: FriendRequestResponse[];
  }> {
    try {
      const response = await httpClient.get<{
        incoming: FriendRequestResponse[];
        outgoing: FriendRequestResponse[];
      }>('/api/v1/friend-requests', true);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get incoming friend requests with pagination
   * @param page Page number (starting from 1)
   * @param limit Number of items per page
   * @returns Paginated incoming friend requests
   */
  static async getIncomingFriendRequests(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedFriendRequests> {
    try {
      return await httpClient.get<PaginatedFriendRequests>(
        `/api/v1/friend-requests/incoming?page=${page}&limit=${limit}`,
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get outgoing friend requests with pagination
   * @param page Page number (starting from 1)
   * @param limit Number of items per page
   * @returns Paginated outgoing friend requests
   */
  static async getOutgoingFriendRequests(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedFriendRequests> {
    try {
      return await httpClient.get<PaginatedFriendRequests>(
        `/api/v1/friend-requests/outgoing?page=${page}&limit=${limit}`,
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Accept a friend request
   * @param requestId ID of the friend request to accept
   * @returns Accepted friend request data
   */
  static async acceptFriendRequest(requestId: string): Promise<FriendRequestResponse> {
    try {
      return await httpClient.put<FriendRequestResponse>(
        `/api/v1/friend-requests/${requestId}/accept`,
        {},
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject a friend request
   * @param requestId ID of the friend request to reject
   * @returns Rejected friend request data
   */
  static async rejectFriendRequest(requestId: string): Promise<FriendRequestResponse> {
    try {
      return await httpClient.put<FriendRequestResponse>(
        `/api/v1/friend-requests/${requestId}/reject`,
        {},
        true
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if the user has any pending friend requests
   * @returns Whether the user has any pending friend requests
   */
  static async hasPendingFriendRequests(): Promise<boolean> {
    try {
      // The API returns a nested structure like { has_pending_requests: { has_pending_requests: boolean } }
      // This happens because the backend wraps the result twice
      const response = await httpClient.get<{ has_pending_requests: boolean }>(
        '/api/v1/friend-requests/has-pending',
        true
      );
      
      if (typeof response?.has_pending_requests === 'boolean') {
        return response.has_pending_requests;
      }
      
      // Default to false if the structure is unexpected
      console.error('Unexpected response structure from has-pending endpoint:', response);
      return false;
    } catch (error) {
      console.error('Error checking pending friend requests:', error);
      return false; // Default to false if there's an error
    }
  }

  /**
   * Fetch users with pagination (admin only)
   * @param page Current page number (starting from 1)
   * @param limit Number of items per page
   * @param role Optional role filter (admin or user)
   * @returns Paginated list of users
   */
  static async getUsers(
    page: number = 1,
    limit: number = 10,
    role?: string | null
  ): Promise<GetUsersResponse> {
    try {
      let url = `/api/v1/admin/users?page=${page}&limit=${limit}`;
      if (role) {
        url += `&role=${role}`;
      }
      return await httpClient.get<GetUsersResponse>(url, true);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  /**
   * Get a specific user by ID (admin only)
   * @param userId User ID to fetch
   * @returns User data
   */
  static async getAdminUserById(userId: string): Promise<AdminUser> {
    try {
      return await httpClient.get<AdminUser>(`/api/v1/admin/users/${userId}`, true);
    } catch (error) {
      console.error(`Failed to fetch user with ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new admin user (admin only)
   * @param userData User data for the new admin
   * @returns Created user data
   */
  static async createAdminUser(userData: CreateAdminUserParams): Promise<AdminUser> {
    try {
      return await httpClient.post<AdminUser>('/api/v1/admin/users', userData, true);
    } catch (error) {
      console.error('Failed to create admin user:', error);
      throw error;
    }
  }

  /**
   * Update a user (admin only)
   * @param userId ID of the user to update
   * @param userData Updated user data
   * @returns Updated user data
   */
  static async updateUser(userId: string, userData: UpdateUserParams): Promise<AdminUser> {
    try {
      return await httpClient.put<AdminUser>(`/api/v1/admin/users/${userId}`, userData, true);
    } catch (error) {
      console.error(`Failed to update user with ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user (admin only)
   * @param userId ID of the user to delete
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      await httpClient.delete<void>(`/api/v1/admin/users/${userId}`, true);
    } catch (error) {
      console.error(`Failed to delete user with ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Vefify email
   * @param token Token to verify
   * @returns Verified email
   */
  static async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    try {
     return await httpClient.post<VerifyEmailResponse>(`/api/v1/verify-email/${token}`);
    } catch (error) {
      throw error;
    }
  }
}

export interface VerifyEmailResponse {
  status: string;
  message: string;
}


// Admin user types
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string | { $date: { $numberLong: string } };
  updatedAt: string | { $date: { $numberLong: string } };
  profileImage?: string;
  region?: string;
  platform?: string;
  autoRegion?: boolean;
  covenantName?: string;
  experience?: string;
  cmRegion?: string;
  cfRegion?: string;
  preferredSessionName?: string;
  preferredSessionPassword?: string;
  preferredNightfarer?: string;
  disabled?: boolean;
}

export interface UsersPaginationResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetUsersResponse {
  data: {
    users: AdminUser[];
    pagination: UsersPaginationResponse;
  };
}

export interface CreateAdminUserParams {
  username: string;
  email: string;
  password: string;
  region?: string;
  platform?: string;
  covenantName: string;
  experience: string;
  disabled?: boolean;
  autoRegion?: boolean;
  role?: string;
}

export interface UpdateUserParams {
  email?: string;
  disabled?: boolean;
} 