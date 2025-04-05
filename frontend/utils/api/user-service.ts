import { httpClient } from './http-client';
import { UserProfile, UpdateProfileParams } from './types';

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
} 