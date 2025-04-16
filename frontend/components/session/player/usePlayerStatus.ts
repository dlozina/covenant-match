import { useMemo } from 'react';
import { SessionState } from '../SessionReducers';

interface PlayerStatusBadge {
  color: string;
  text: string;
}

export function usePlayerStatus(
  isHost: boolean, 
  sessionState: SessionState
): PlayerStatusBadge {
  return useMemo(() => {
    // First check session state
    if (sessionState.isSessionFinished) {
      return {
        color: "bg-purple-950/30 text-purple-500 border-purple-500",
        text: "Finished"
      };
    }
    
    if (sessionState.isSessionStarted) {
      return {
        color: "bg-purple-950/30 text-purple-500 border-purple-500",
        text: "Running"
      };
    }
    
    return {
      color: "bg-amber-950/30 text-amber-500 border-amber-500",
      text: "Ready"
    };
  }, [sessionState.isSessionFinished, sessionState.isSessionStarted]);
} 