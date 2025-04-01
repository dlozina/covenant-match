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
  resultSubmitted?: boolean;
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

/**
 * @deprecated This hook is deprecated. The logic has been simplified and moved directly 
 * into the SessionControlButtons component for better maintainability.
 */
export function useSessionControls({
  sessionState,
  sessionData,
  isHost = false,
  currentSessionId,
  isNewSessionLoading = false,
  disabled = false,
  onRecreateSession,
  resultSubmitted = false
}: UseSessionControlsProps): SessionControlsState {
  return useMemo(() => {
    // DEBUG: Log the inputs that affect button state
    console.log('useSessionControls inputs:', {
      isHost,
      hasOnRecreateSession: Boolean(onRecreateSession),
      isNewSessionLoading,
      disabled,
      resultSubmitted
    });
    
    // Check if we have enough players to start (3 players required)
    const hasEnoughPlayers = Boolean(sessionData && sessionData.joinedPlayers.length >= 3);
    
    // Disable buttons based on session state and host status
    const startButtonDisabled = sessionState.isSessionStarted || disabled || !hasEnoughPlayers || !isHost;
    const finishButtonDisabled = !sessionState.isSessionStarted || sessionState.isSessionFinished || disabled || !isHost;
    
    // A "new session" is available for non-host players (they should join) if there's a recreate action available
    // CRITICAL FIX: Make sure we still consider a session available even if the player submitted results
    const newSessionAvailable = !isHost && Boolean(onRecreateSession);
    
    // CRITICAL FIX: Don't disable the recreate button just because a player submitted results
    // The button should ONLY be disabled if:
    // 1. The whole form is disabled, OR
    // 2. The player is not a host AND there's no new session available, OR
    // 3. A new session is currently loading
    // We explicitly ignore the resultSubmitted state here
    const recreateButtonDisabled = Boolean(
      disabled || (!isHost && !onRecreateSession) || isNewSessionLoading
    );
    
    // DEBUG: Log the calculated button state
    console.log('Calculated button state:', {
      newSessionAvailable,
      recreateButtonDisabled,
      onRecreateSession: Boolean(onRecreateSession)
    });
    
    // Create tooltips for the buttons
    const startButtonTooltip = !isHost ? "Only the host can start the session" : 
                              !hasEnoughPlayers ? "Need at least 3 players to start" : 
                              sessionState.isSessionStarted ? "Session already started" : "";
                              
    const finishButtonTooltip = !isHost ? "Only the host can finish the session" : 
                               !sessionState.isSessionStarted ? "Session must be started first" : 
                               sessionState.isSessionFinished ? "Session already finished" : "";
    
    // Update tooltip depending on result submission status
    const recreateButtonTooltip = !isHost && !onRecreateSession 
                                ? "Wait for the host to create a new session" 
                                : !isHost && onRecreateSession 
                                ? resultSubmitted 
                                  ? "You can still join the new session after submitting results" 
                                  : "Click to join the new session" 
                                : "Create a new session with the same team";
    
    // Only highlight the button if this is an original session (not a recreated one we've joined)
    // CRITICAL FIX: Make sure the button is still highlighted even if the player submitted their result
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
    onRecreateSession,
    resultSubmitted
  ]);
} 