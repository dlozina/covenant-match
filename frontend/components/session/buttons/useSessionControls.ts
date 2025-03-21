import { useMemo } from 'react';
import { SessionState } from '../SessionReducers';
import { SessionData } from '../common/types';

interface UseSessionControlsProps {
  sessionState: SessionState;
  sessionData?: SessionData;
  isHost?: boolean;
  currentSessionId?: string;
  isNewSessionLoading?: boolean;
  disabled?: boolean;
  onRecreateSession?: () => void;
}

interface SessionControlsState {
  hasEnoughPlayers: boolean;
  startButtonDisabled: boolean;
  finishButtonDisabled: boolean;
  recreateButtonDisabled: boolean;
  startButtonTooltip: string;
  finishButtonTooltip: string;
  recreateButtonTooltip: string;
  newSessionAvailable: boolean;
  shouldHighlightButton: boolean;
}

export function useSessionControls({
  sessionState,
  sessionData,
  isHost = false,
  currentSessionId,
  isNewSessionLoading = false,
  disabled = false,
  onRecreateSession
}: UseSessionControlsProps): SessionControlsState {
  return useMemo(() => {
    // Check if we have enough players to start (3 players required)
    const hasEnoughPlayers = Boolean(sessionData && sessionData.joinedPlayers.length >= 3);
    
    // Disable buttons based on session state and host status
    const startButtonDisabled = sessionState.isSessionStarted || disabled || !hasEnoughPlayers || !isHost;
    const finishButtonDisabled = !sessionState.isSessionStarted || sessionState.isSessionFinished || disabled || !isHost;
    
    // A "new session" is available for non-host players (they should join) if there's a recreate action available
    const newSessionAvailable = !isHost && Boolean(onRecreateSession);
    const recreateButtonDisabled = disabled || (!isHost && !newSessionAvailable) || isNewSessionLoading;
    
    // Create tooltips for the buttons
    const startButtonTooltip = !isHost ? "Only the host can start the session" : 
                              !hasEnoughPlayers ? "Need at least 3 players to start" : 
                              sessionState.isSessionStarted ? "Session already started" : "";
                              
    const finishButtonTooltip = !isHost ? "Only the host can finish the session" : 
                               !sessionState.isSessionStarted ? "Session must be started first" : 
                               sessionState.isSessionFinished ? "Session already finished" : "";
    
    const recreateButtonTooltip = !isHost && !newSessionAvailable 
                                ? "Wait for the host to create a new session" 
                                : !isHost && newSessionAvailable 
                                ? "Click to join the new session" 
                                : "Create a new session with the same team";
    
    // Only highlight the button if this is an original session (not a recreated one we've joined)
    const shouldHighlightButton = Boolean(newSessionAvailable && sessionData && currentSessionId === sessionData.id);
    
    return {
      hasEnoughPlayers,
      startButtonDisabled,
      finishButtonDisabled,
      recreateButtonDisabled,
      startButtonTooltip,
      finishButtonTooltip,
      recreateButtonTooltip,
      newSessionAvailable,
      shouldHighlightButton,
    };
  }, [
    sessionState, 
    sessionData, 
    isHost, 
    currentSessionId, 
    isNewSessionLoading, 
    disabled,
    onRecreateSession
  ]);
} 