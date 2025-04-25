import { useState, useEffect, useCallback } from 'react';
import { FeatureFlagService } from '@/utils/api/feature-flag-service';

/**
 * Custom hook to use feature flags in components.
 * @param key - Feature flag key
 * @param defaultValue - Default value to use if flag is not found
 * @returns Object with flag value and loading state
 */
export function useFeatureFlag(key: string, defaultValue = false) {
  const [enabled, setEnabled] = useState<boolean>(defaultValue);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlag = useCallback(async () => {
    try {
      setLoading(true);
      const value = await FeatureFlagService.getFeatureFlagValue(key, defaultValue);
      setEnabled(value);
      setError(null);
    } catch (err) {
      console.error(`Error fetching feature flag ${key}:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setEnabled(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    fetchFlag();
    
    // Optional polling for critical flags
    // Uncomment if you want real-time updates without page refresh
    /*
    const interval = setInterval(() => {
      fetchFlag();
    }, 60000); // Poll every minute
    
    return () => clearInterval(interval);
    */
  }, [fetchFlag]);

  return { enabled, loading, error, refresh: fetchFlag };
} 