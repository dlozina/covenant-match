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
    // For finished sessions
    if (sessionState.isSessionFinished) {
      // Only show "Reported" if the player has actually submitted a result
      if (hasReported) {
        return {
          color: "bg-emerald-950/30 text-emerald-500 border-emerald-500",
          text: "Reported"
        };
      } else {
        return {
          color: "bg-red-950/30 text-red-500 border-red-500",
          text: "Result Pending"
        };
      }
    }
    
    // For sessions in progress
    if (sessionState.isSessionStarted) {
      return {
        color: "bg-purple-950/30 text-purple-500 border-purple-500",
        text: "Running"
      };
    }
    
    // For sessions not yet started
    return {
      color: "bg-amber-950/30 text-amber-500 border-amber-500",
      text: "Ready"
    };
  }, [sessionState.isSessionFinished, sessionState.isSessionStarted, hasReported, isHost]);
} 