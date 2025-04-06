import { ApiError } from './errors';

// Configuration
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  requiresAuth?: boolean;
  includeCredentials?: boolean;
}

export interface HttpClient {
  request<T>(endpoint: string, options: RequestOptions): Promise<T>;
  get<T>(endpoint: string, requiresAuth?: boolean): Promise<T>;
  post<T>(endpoint: string, data: unknown, requiresAuth?: boolean, includeCredentials?: boolean): Promise<T>;
  put<T>(endpoint: string, data: unknown, requiresAuth?: boolean): Promise<T>;
  delete<T>(endpoint: string, requiresAuth?: boolean): Promise<T>;
  patch<T>(endpoint: string, data: unknown, requiresAuth?: boolean): Promise<T>;
}

// Helper to get JWT token
export const getToken = (): string => {
  if (typeof document !== 'undefined') {
    // Browser environment
    const authCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth='));
    
    if (authCookie) {
      return authCookie.split('=')[1];
    }
    
    // Try to get token from localStorage if not in cookie
    const token = localStorage.getItem('token');
    if (token) {
      return token;
    }
  }
  return '';
};

class ApiClient implements HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL || '') {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.requiresAuth) {
      const token = getToken();
      if (!token) {
        throw new ApiError('Authentication required', 401);
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    if (options.includeCredentials) {
      fetchOptions.credentials = 'include';
    }

    try {
      const response = await fetch(url, fetchOptions);
      // For DELETE with no content
      if (response.status === 204) {
        return {} as T;
      }
      
      // Try to parse as JSON, but handle if no content
      let data: Record<string, unknown> = {};
      const textResponse = await response.text();
      try {
        data = textResponse ? JSON.parse(textResponse) : {};
      } catch {
        // Ignore parse errors and use empty object
        data = {};
      }

      if (!response.ok) {
        throw new ApiError(
          (data.message as string) || `API error: ${response.statusText}`, 
          response.status,
          data
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Wrap other errors
      console.error('API request failed:', error);
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown API error',
        0
      );
    }
  }

  async get<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      requiresAuth,
    });
  }

  async post<T>(endpoint: string, data: unknown, requiresAuth = false, includeCredentials = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data,
      requiresAuth,
      includeCredentials,
    });
  }

  async put<T>(endpoint: string, data: unknown, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data,
      requiresAuth,
    });
  }

  async delete<T>(endpoint: string, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      requiresAuth,
    });
  }

  async patch<T>(endpoint: string, data: unknown, requiresAuth = true): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data,
      requiresAuth,
    });
  }
}

// Export a singleton instance
export const httpClient = new ApiClient();

// Allow injection for testing
export const createHttpClient = (baseUrl?: string): HttpClient => {
  return new ApiClient(baseUrl);
}; 