import { httpClient } from './http-client';
import { ApiError } from './errors';

export class EmailService {
  private client = httpClient;
  
  /**
   * Send password reset email
   * @param email User email address
   * @returns Promise that resolves when email is successfully sent
   */
  async sendResetPasswordEmail(email: string): Promise<void> {
    try {
      await this.client.post<void>(
        '/api/v1/reset-password-email',
        { email },
        false
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param password New password
   * @param token Reset token (from URL query string)
   * @returns Promise that resolves when password is successfully reset
   */
  async resetPassword(password: string, token: string): Promise<void> {
    try {
      await this.client.post<void>(
        `/api/v1/reset-password/${token}`,
        { password },
        false
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to reset password', 500);
    }
  }

  /**
   * Send password reset email (static method)
   * @param email User email address
   * @returns Promise that resolves when email is successfully sent
   */
  static async sendResetPasswordEmail(email: string): Promise<void> {
    try {
      await httpClient.post<void>(
        '/api/v1/reset-password-email',
        { email },
        false
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to send reset password email', 500);
    }
  }

  /**
   * Reset password with token (static method)
   * @param password New password 
   * @param token Reset token (from URL query string)
   * @returns Promise that resolves when password is successfully reset
   */
  static async resetPassword(password: string, token: string): Promise<void> {
    try {
      await httpClient.post<void>(
        `/api/v1/reset-password/${token}`,
        { password },
        false
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to reset password', 500);
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService(); 