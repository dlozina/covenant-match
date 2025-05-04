import { useState, useEffect, useCallback, useRef } from 'react';
import { useSessionData, useStartSession, useFinishSession } from './queries/useSessionQueries';
import { useAuth } from '@/lib/auth-context';
import { formatDuration } from '@/utils/dateUtils';

// Define types
export interface SessionState {
  isSessionStarted: boolean;
  isSessionFinished: boolean;
  elapsedSeconds: number;
  finalDuration: number | null;
}

// Helper for localStorage persistence
const storageUtils = {
  // Keys
  SESSION_START_KEY: 'session_start_time',
  SESSION_ID_KEY: 'session_id',
  SESSION_FINISHED_KEY: 'session_finished',
  SESSION_DURATION_KEY: 'session_final_duration',

  // Save session start
  saveSessionStart: (startTime: number, sessionId: string) => {
    localStorage.setItem(storageUtils.SESSION_START_KEY, startTime.toString());
    localStorage.setItem(storageUtils.SESSION_ID_KEY, sessionId);
    localStorage.setItem(storageUtils.SESSION_FINISHED_KEY, 'false');
  },

  // Save session finish
  saveSessionFinish: (duration: number) => {
    localStorage.setItem(storageUtils.SESSION_FINISHED_KEY, 'true');
    localStorage.setItem(storageUtils.SESSION_DURATION_KEY, duration.toString());
  },

  // Get stored session data
  getStoredSession: (sessionId: string) => {
    const storedSessionId = localStorage.getItem(storageUtils.SESSION_ID_KEY);
    
    // Only return data if it's for the current session
    if (storedSessionId !== sessionId) {
      return null;
    }

    const startTimeStr = localStorage.getItem(storageUtils.SESSION_START_KEY);
    const isFinishedStr = localStorage.getItem(storageUtils.SESSION_FINISHED_KEY);
    const durationStr = localStorage.getItem(storageUtils.SESSION_DURATION_KEY);

    if (!startTimeStr) {
      return null;
    }

    return {
      startTime: parseInt(startTimeStr, 10),
      isFinished: isFinishedStr === 'true',
      finalDuration: durationStr ? parseInt(durationStr, 10) : null
    };
  },

  // Clear session data
  clearSessionData: () => {
    localStorage.removeItem(storageUtils.SESSION_START_KEY);
    localStorage.removeItem(storageUtils.SESSION_ID_KEY);
    localStorage.removeItem(storageUtils.SESSION_FINISHED_KEY);
    localStorage.removeItem(storageUtils.SESSION_DURATION_KEY);
  }
};

export function useSessionState(sessionId: string | null) {
  const { userData } = useAuth();
  const { data: sessionData, isLoading, error, refetch } = useSessionData(sessionId);
  
  // Start/finish session mutations
  const startSessionMutation = useStartSession();
  const finishSessionMutation = useFinishSession();

  // Session state with initial values
  const [sessionState, setSessionState] = useState<SessionState>({
    isSessionStarted: false,
    isSessionFinished: false,
    elapsedSeconds: 0,
    finalDuration: null
  });

  // References for timing
  const sessionStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format time utility
  const formatTime = useCallback((totalSeconds: number): string => {
    return formatDuration(totalSeconds);
  }, []);

  // Check if current user is host
  const isHost = useCallback((): boolean => {
    if (!sessionData || !userData) return false;
    return sessionData.hostId === userData.id;
  }, [sessionData, userData]);

  // Reset session state
  const resetSession = useCallback((): void => {
    // Clear data from localStorage
    storageUtils.clearSessionData();
    
    // Reset state
    setSessionState({
      isSessionStarted: false,
      isSessionFinished: false,
      elapsedSeconds: 0,
      finalDuration: null
    });
    
    // Clear references
    sessionStartTimeRef.current = null;
    
    // Clear timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Start session
  const startSession = useCallback(async (): Promise<void> => {
    if (!sessionId || sessionState.isSessionStarted) {
      console.log('Cannot start session: already started or no sessionId');
      return;
    }
    
    // Set session as started locally first (optimistic update)
    const startTime = Date.now();
    sessionStartTimeRef.current = startTime;
    
    // Update local state
    setSessionState(prev => ({
      ...prev,
      isSessionStarted: true,
      elapsedSeconds: 0
    }));
    
    // Store in localStorage for persistence
    storageUtils.saveSessionStart(startTime, sessionId);
    
    // Call API to start session
    try {
      await startSessionMutation.mutateAsync(sessionId);
      console.log('Session started successfully');
    } catch (err) {
      console.error('Error starting session:', err);
      
      // Revert optimistic update on error
      setSessionState(prev => ({
        ...prev,
        isSessionStarted: false
      }));
      
      sessionStartTimeRef.current = null;
      storageUtils.clearSessionData();
      
      throw err;
    }
  }, [sessionId, sessionState.isSessionStarted, startSessionMutation]);

  // Finish session
  const finishSession = useCallback(async (): Promise<void> => {
    if (!sessionId || !sessionState.isSessionStarted || sessionState.isSessionFinished) {
      console.log('Cannot finish session: invalid state');
      return;
    }
    
    // Calculate final duration
    let finalDuration = sessionState.elapsedSeconds;
    
    // If we have a start time reference, calculate more accurately
    if (sessionStartTimeRef.current) {
      const now = Date.now();
      const calculatedElapsed = Math.floor((now - sessionStartTimeRef.current) / 1000);
      
      if (calculatedElapsed > 0) {
        finalDuration = calculatedElapsed;
      }
    }
    
    // Ensure we never have a zero duration
    finalDuration = Math.max(1, finalDuration);
    
    // Update local state first (optimistic update)
    setSessionState(prev => ({
      ...prev,
      isSessionFinished: true,
      elapsedSeconds: finalDuration,
      finalDuration
    }));
    
    // Store in localStorage
    storageUtils.saveSessionFinish(finalDuration);
    
    // Call API to finish session
    try {
      await finishSessionMutation.mutateAsync({ 
        sessionId, 
        duration: finalDuration 
      });
      console.log('Session finished successfully');
    } catch (err) {
      console.error('Error finishing session:', err);
      
      // Revert optimistic update on error
      setSessionState(prev => ({
        ...prev,
        isSessionFinished: false,
        finalDuration: null
      }));
      
      throw err;
    }
  }, [sessionId, sessionState, finishSessionMutation]);

  // Timer to update elapsed time
  useEffect(() => {
    if (!sessionState.isSessionStarted || sessionState.isSessionFinished) {
      // Clear any existing interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }
    
    // Start a timer to update elapsed time
    timerIntervalRef.current = setInterval(() => {
      if (sessionStartTimeRef.current) {
        const now = Date.now();
        const elapsed = Math.floor((now - sessionStartTimeRef.current) / 1000);
        
        setSessionState(prev => ({
          ...prev,
          elapsedSeconds: elapsed
        }));
      }
    }, 1000);
    
    // Clean up on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [sessionState.isSessionStarted, sessionState.isSessionFinished]);

  // Sync with server data when it changes
  useEffect(() => {
    if (!sessionData || isLoading) return;
    
    console.log('Syncing with server data:', sessionData.status);
    
    // First try to restore from localStorage (for continuity across refreshes)
    const storedSession = storageUtils.getStoredSession(sessionId || '');
    
    // Define a function to set session state based on server data
    const syncWithServerState = () => {
      console.log('Running server state sync, status:', sessionData.status);
      const newState = { ...sessionState };
      
      // Check if session is started according to server
      if (sessionData.status === 'InProgress' && sessionData.startedAt) {
        // Server says session is started
        newState.isSessionStarted = true;
        
        // Update start time if not already set
        if (!sessionStartTimeRef.current && sessionData.startedAt) {
          try {
            const serverStartTime = new Date(sessionData.startedAt).getTime();
            sessionStartTimeRef.current = serverStartTime;
            storageUtils.saveSessionStart(serverStartTime, sessionId || '');
            
            // Calculate elapsed time based on server start time
            const now = Date.now();
            const elapsed = Math.floor((now - serverStartTime) / 1000);
            newState.elapsedSeconds = elapsed;
          } catch (e) {
            console.error('Error parsing startedAt timestamp:', e);
          }
        }
      }
      
      // Check if session is finished according to server
      if (sessionData.status === 'Completed' && sessionData.completedAt) {
        newState.isSessionFinished = true;
        
        // Calculate duration from server timestamps if available
        if (sessionData.startedAt && sessionData.completedAt) {
          try {
            const startTime = new Date(sessionData.startedAt).getTime();
            const endTime = new Date(sessionData.completedAt).getTime();
            
            if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
              const calculatedDuration = Math.floor((endTime - startTime) / 1000);
              newState.finalDuration = calculatedDuration;
              newState.elapsedSeconds = calculatedDuration;
              
              // Store final duration in localStorage
              storageUtils.saveSessionFinish(calculatedDuration);
            }
          } catch (e) {
            console.error('Error calculating duration from timestamps:', e);
          }
        }
      }
      
      // Apply the state updates
      console.log('New state after server sync:', newState);
      setSessionState(newState);
    };
    
    // If we have localStorage data, use it first (for immediate UI response)
    if (storedSession) {
      console.log('Restoring session from localStorage:', storedSession);
      
      // Use localStorage data to set start time reference
      sessionStartTimeRef.current = storedSession.startTime;
      
      const now = Date.now();
      const elapsed = storedSession.isFinished 
        ? (storedSession.finalDuration || 0)
        : Math.floor((now - storedSession.startTime) / 1000);
      
      setSessionState({
        isSessionStarted: true,
        isSessionFinished: storedSession.isFinished,
        elapsedSeconds: elapsed,
        finalDuration: storedSession.isFinished ? (storedSession.finalDuration || elapsed) : null
      });
    }
    
    // ALWAYS sync with server data (server is the source of truth)
    // We do this after localStorage restoration to ensure server data takes precedence
    syncWithServerState();
    
  }, [sessionData, isLoading, sessionId]);

  // Set up visibility change listener to refresh when the user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionId) {
        console.log('Page became visible, refreshing session state');
        refetch();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, refetch]);

  return {
    sessionData,
    isLoading,
    error,
    sessionState,
    isHost,
    formatTime,
    startSession,
    finishSession,
    resetSession,
    refreshSession: refetch
  };
} 