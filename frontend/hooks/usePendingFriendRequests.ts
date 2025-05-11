import { useState, useEffect, useCallback } from 'react';
import { UserService } from '@/utils/api/user-service';

/**
 * Hook to check if the user has any pending friend requests
 * @param isLoggedIn Whether the user is logged in
 * @param refreshInterval How often to check for new friend requests when inactive (ms), default 5min
 * @param activeRefreshInterval How often to check when user is active (ms), default 1min
 * @returns Object with hasPendingRequests state and refresh function
 */
export function usePendingFriendRequests(
  isLoggedIn: boolean, 
  refreshInterval = 300000, // 5 minutes when inactive
  activeRefreshInterval = 60000 // 1 minute when active
) {
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isActive, setIsActive] = useState(true);

  // Function to check for pending friend requests
  const checkPendingRequests = useCallback(async () => {
    if (!isLoggedIn) {
      setHasPendingRequests(false);
      return;
    }

    try {
      setIsLoading(true);
      // The hasPendingFriendRequests function now returns a simple boolean
      const hasPending = await UserService.hasPendingFriendRequests();
      setHasPendingRequests(hasPending);
    } catch (error) {
      console.error('Error checking pending friend requests:', error);
      setHasPendingRequests(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
      setIsActive(true);
    };

    // Listen for user interactions
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Check activity status every minute
    const activityCheckInterval = setInterval(() => {
      const now = Date.now();
      // If no activity for 2 minutes, consider user inactive
      if (now - lastActivity > 120000) {
        setIsActive(false);
      }
    }, 60000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(activityCheckInterval);
    };
  }, [lastActivity]);

  // Effect for periodic checks with dynamic interval
  useEffect(() => {
    // Initial check on mount
    checkPendingRequests();

    // Use different polling intervals based on activity
    const currentInterval = isActive ? activeRefreshInterval : refreshInterval;
    
    // Set up interval for periodic checks
    const intervalId = setInterval(checkPendingRequests, currentInterval);

    // Clean up interval on unmount or when dependencies change
    return () => clearInterval(intervalId);
  }, [isLoggedIn, refreshInterval, activeRefreshInterval, isActive, checkPendingRequests]);

  return {
    hasPendingRequests,
    isLoading,
    refresh: checkPendingRequests
  };
} 