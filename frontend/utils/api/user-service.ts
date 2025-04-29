import { httpClient } from './http-client';
import { FriendList, UserProfile, UpdateProfileParams } from './types';

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
   * @returns List of friends
   */
  static async getFriendList(): Promise<FriendList> {
    try {
      return await httpClient.get<FriendList>('/api/v1/friends', true);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add a friend to the current user's friend list
   * @param friendId ID of the friend to add
   */
  static async addFriend(friendId: string): Promise<void> {
    try {
      await httpClient.post<void>('/api/v1/friends', { friendId }, true);
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
}

// Admin user types
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string | { $date: { $numberLong: string } };
  updatedAt: string | { $date: { $numberLong: string } };
  profileImage?: string;
  region?: string;
  platform?: string;
  autoRegion?: boolean;
  covenantName?: string;
  cmRegion?: string;
  cfRegion?: string;
  preferredSessionName?: string;
  preferredSessionPassword?: string;
  preferredNightfarer?: string;
  active: boolean;
}

export interface UsersPaginationResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface GetUsersResponse {
  status: string;
  data: {
    users: AdminUser[];
    pagination: UsersPaginationResponse;
  };
}

export interface CreateAdminUserParams {
  username: string;
  email: string;
  displayName: string;
  password: string;
  region?: string;
  platform?: string;
  covenantName: string;
  experience: string;
  active?: boolean;
  autoRegion?: boolean;
  role?: string;
}

export interface UpdateUserParams {
  email?: string;
  displayName?: string;
  active?: boolean;
} 