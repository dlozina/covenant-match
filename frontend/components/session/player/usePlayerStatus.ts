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
      return {
        color: "bg-gray-950/30 text-gray-500 border-gray-500",
        text: "Finished"
      };
    }
    
    if (sessionState.isSessionStarted) {
      if (hasReported) {
        return {
          color: "bg-green-950/30 text-green-500 border-green-500",
          text: "Reported"
        };
      } else {
        return {
          color: "bg-blue-950/30 text-blue-500 border-blue-500",
          text: "Playing"
        };
      }
    }
    
    return {
      color: "bg-amber-950/30 text-amber-500 border-amber-500",
      text: "Ready"
    };
  }, [sessionState.isSessionFinished, sessionState.isSessionStarted, hasReported]);
} 