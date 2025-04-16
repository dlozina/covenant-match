import { useMemo } from 'react';
import { SessionState } from '../SessionReducers';

interface PlayerStatusBadge {
  color: string;
  text: string;
}

export function usePlayerStatus(
  isHost: boolean, 
  sessionState: SessionState, 
  hasReported: boolean = false
): PlayerStatusBadge {
  return useMemo(() => {
    if (sessionState.isSessionFinished) {
      if (hasReported) {
        return {
          color: "bg-green-950/30 text-green-500 border-green-500",
          text: "Reported"
        };
      } else {
        return {
          color: "bg-red-950/30 text-red-500 border-red-500",
          text: "Result Pending"
        };
      }
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
  }, [sessionState.isSessionFinished, sessionState.isSessionStarted, hasReported]);
} 