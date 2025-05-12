import { useState, useCallback } from 'react';
import { useSessionData, useStartSession, useFinishSession } from './queries/useSessionQueries';
import { useAuth } from '@/lib/auth-context';

// Define types
export interface SessionState {
  isSessionStarted: boolean;
  isSessionFinished: boolean;
}

// Initial session state
const initialState: SessionState = {
  isSessionStarted: false,
  isSessionFinished: false
};

export function useSessionState(sessionId: string | null) {
  const { userData } = useAuth();
  const { data: sessionData, isLoading, error, refetch } = useSessionData(sessionId);
  
  // Start/finish session mutations
  const startSessionMutation = useStartSession();
  const finishSessionMutation = useFinishSession();

  // Session state with initial values
  const [sessionState, setSessionState] = useState<SessionState>(initialState);

  // Check if current user is host
  const isHost = useCallback((): boolean => {
    if (!sessionData || !userData) return false;
    return sessionData.hostId === userData.id;
  }, [sessionData, userData]);

  // Reset session state
  const resetSession = useCallback((): void => {
    // Reset state to initial values
    setSessionState(initialState);
  }, []);

  // Start session
  const startSession = useCallback(async (): Promise<void> => {
    if (!sessionId || sessionState.isSessionStarted) {
      console.log('Cannot start session: already started or no sessionId');
      return;
    }
    
    // Set session as started locally first (optimistic update)
    setSessionState(prev => ({
      ...prev,
      isSessionStarted: true
    }));
    
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
      
      throw err;
    }
  }, [sessionId, sessionState.isSessionStarted, startSessionMutation]);

  // Finish session
  const finishSession = useCallback(async (): Promise<void> => {
    if (!sessionId || !sessionState.isSessionStarted || sessionState.isSessionFinished) {
      console.log('Cannot finish session: invalid state');
      return;
    }
    
    // Update local state first (optimistic update)
    setSessionState(prev => ({
      ...prev,
      isSessionFinished: true
    }));
    
    // Call API to finish session
    try {
      await finishSessionMutation.mutateAsync({ 
        sessionId, 
        duration: 1 // Dummy value, server will calculate from timestamps
      });
      console.log('Session finished successfully');
    } catch (err) {
      console.error('Error finishing session:', err);
      
      // Revert optimistic update on error
      setSessionState(prev => ({
        ...prev,
        isSessionFinished: false
      }));
      
      throw err;
    }
  }, [sessionId, sessionState, finishSessionMutation]);

  // Update session state when session data changes
  if (sessionData) {
    // Check if session is started according to server
    if (sessionData.status === 'InProgress' && sessionData.startedAt && !sessionState.isSessionStarted) {
      setSessionState(prev => ({
        ...prev,
        isSessionStarted: true
      }));
    }
    
    // Check if session is finished according to server
    if (sessionData.status === 'Completed' && sessionData.completedAt && !sessionState.isSessionFinished) {
      setSessionState(prev => ({
        ...prev,
        isSessionFinished: true
      }));
    }
  }

  return {
    sessionState,
    isHost,
    startSession,
    finishSession,
    resetSession,
    isLoading,
    error,
    refetch
  };
} 