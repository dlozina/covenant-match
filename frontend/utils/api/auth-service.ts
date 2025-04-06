import { httpClient } from './http-client';
import { LoginParams, LoginResponse, RegisterParams } from './types';
import { ApiError } from './errors';

export class AuthService {
  /**
   * Log in a user
   * @param credentials User login credentials
   * @returns Login response with token
   */
  static async login(credentials: LoginParams): Promise<LoginResponse> {
    try {
      return await httpClient.post<LoginResponse>(
        '/api/v1/auth/login', 
        credentials,
        false, 
        true // Include credentials
      );
    } catch (error) {
      // Rethrow with specific error handling if needed
      throw error;
    }
  }

  /**
   * Register a new user
   * @param userData User registration data
   * @returns Registration response with token
   */
  static async register(userData: RegisterParams): Promise<LoginResponse> {
    try {
      return await httpClient.post<LoginResponse>(
        '/api/v1/register',
        userData,
        false
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Log out the current user
   */
  static async logout(): Promise<void> {
    // Use local storage clearing
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    
    // You might want to hit a server endpoint to invalidate the token as well
    try {
      await httpClient.post<void>('/api/v1/auth/logout', {}, true);
    } catch (error) {
      // Just log this error but don't rethrow - we still want to clear local storage
      console.error('Error logging out on server:', error);
    }
  }

  /**
   * Check if the current user's token is valid
   * @returns true if token is valid
   */
  static async validateToken(): Promise<boolean> {
    try {
      await httpClient.get<{ valid: boolean }>('/api/v1/auth/validate', true);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return false;
      }
      throw error;
    }
  }
} 