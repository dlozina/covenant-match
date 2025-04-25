import { httpClient } from './http-client';

// Feature flag interfaces
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureFlagResponse {
  status: string;
  data: {
    featureFlag: FeatureFlag;
  };
}

export interface FeatureFlagsResponse {
  status: string;
  data: {
    featureFlags: FeatureFlag[];
  };
}

export interface CreateFeatureFlagDto {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean;
}

export interface FeatureFlagValueResponse {
  status: string;
  data: {
    key: string;
    enabled: boolean;
  };
}

// Feature flag cache for client-side usage
const featureFlagCache = new Map<string, {
  value: boolean;
  timestamp: number;
}>();

const CACHE_TTL = 60 * 1000; // 1 minute in milliseconds

export class FeatureFlagService {
  /**
   * Get all feature flags (admin only)
   * @returns List of all feature flags
   */
  static async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const response = await httpClient.get<FeatureFlagsResponse>('/api/v1/admin/feature-flags', true);
      
      return response.data.featureFlags;
    } catch (error) {
      console.error('Failed to get feature flags:', error);
      throw error;
    }
  }

  /**
   * Get a feature flag by key (admin only)
   * @param key Feature flag key
   * @returns Feature flag data
   */
  static async getFeatureFlag(key: string): Promise<FeatureFlag> {
    try {
      const response = await httpClient.get<FeatureFlagResponse>(`/api/v1/admin/feature-flags/${key}`, true);
      return response.data.featureFlag;
    } catch (error) {
      console.error(`Failed to get feature flag ${key}:`, error);
      throw error;
    }
  }

  /**
   * Create a new feature flag (admin only)
   * @param data Feature flag data
   * @returns Created feature flag
   */
  static async createFeatureFlag(data: CreateFeatureFlagDto): Promise<FeatureFlag> {
    try {
      const response = await httpClient.post<FeatureFlagResponse>('/api/v1/admin/feature-flags', data, true);
      return response.data.featureFlag;
    } catch (error) {
      console.error('Failed to create feature flag:', error);
      throw error;
    }
  }

  /**
   * Update a feature flag (admin only)
   * @param key Feature flag key
   * @param data Feature flag data
   * @returns Updated feature flag
   */
  static async updateFeatureFlag(key: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    try {
      const response = await httpClient.put<FeatureFlagResponse>(`/api/v1/admin/feature-flags/${key}`, data, true);
      
      // Clear cache for this key if it exists
      featureFlagCache.delete(key);
      
      return response.data.featureFlag;
    } catch (error) {
      console.error(`Failed to update feature flag ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a feature flag (admin only)
   * @param key Feature flag key
   * @returns Success status
   */
  static async deleteFeatureFlag(key: string): Promise<void> {
    try {
      await httpClient.delete(`/api/v1/admin/feature-flags/${key}`, true);
      
      // Clear cache for this key if it exists
      featureFlagCache.delete(key);
    } catch (error) {
      console.error(`Failed to delete feature flag ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a feature flag value by key (client-facing API, can be used by any authenticated user)
   * This method uses caching to reduce API calls
   * @param key Feature flag key
   * @param defaultValue Default value if flag doesn't exist
   * @param bypassCache If true, bypass the cache and fetch from server
   * @returns Feature flag value (boolean)
   */
  static async getFeatureFlagValue(key: string, defaultValue = false, bypassCache = false): Promise<boolean> {
    try {
      // Check cache first unless bypassCache is true
      const cachedItem = featureFlagCache.get(key);
      const now = Date.now();
      
      if (!bypassCache && cachedItem && now - cachedItem.timestamp < CACHE_TTL) {
        console.log(`[Feature Flag] Using cached value for ${key}: ${cachedItem.value}`);
        return cachedItem.value;
      }
      
      // If not in cache, expired, or bypassing cache, fetch from API
      console.log(`[Feature Flag] Fetching ${key} from server...`);
      const response = await httpClient.get<FeatureFlagValueResponse>(`/api/v1/feature-flags/${key}`, true);
      const enabled = response.data.enabled;
      
      // Update cache
      featureFlagCache.set(key, {
        value: enabled,
        timestamp: now
      });
      
      console.log(`[Feature Flag] Set ${key} to ${enabled} in cache`);
      return enabled;
    } catch (error) {
      console.warn(`Failed to get feature flag value for ${key}, using default:`, error);
      return defaultValue;
    }
  }
} 