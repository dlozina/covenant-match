import { useCallback, useReducer, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { 
  PlayerSection,
  SessionControlButtons,
  SessionInfoSection,
  ResultReportingSection,
  FinishSessionDialog,
  WarningDialog,
  DeleteSessionDialog,
  KickPlayerDialog
} from "@/components/session";
import {
  friendStatusReducer,
  dialogReducer,
  resultReducer,
  FriendState,
  DialogState
} from "@/components/session/SessionReducers";
import { cancelSession } from "@/utils/api";
import { SessionService } from "@/utils/api/session-service";
import { Notification, NotificationType } from "@/components/ui/notification";
import { useSessionContext } from "../context/SessionContext";

export function SessionHost() {
  const router = useRouter();
  
  // Get session context
  const {
    sessionData,
    sessionState,
    isLoading,
    error,
    isHost,
    resetSession,
    startSession,
    handleFinishSession,
    refreshSession,
    updatePlayerReportedStatus
  } = useSessionContext();
  
  // Get auth context - moved before conditional return
  const { userData, fetchWithAuth } = useAuth();
  
  // State for notifications
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // State for tracking recreation of a session
  const [isCreatingNewSession, setIsCreatingNewSession] = useState<boolean>(false);
  
  // Reducers for UI state
  const [friendState, dispatchFriend] = useReducer(friendStatusReducer, {} as FriendState);
  const [dialogState, dispatchDialog] = useReducer(dialogReducer, {
    showConfirmDialog: false,
    showWarningDialog: false,
    showDeleteDialog: false,
    showNewSessionDialog: false,
    showKickDialog: false,
    kickPlayerId: '',
    kickPlayerName: ''
  } as DialogState);
  const [resultState, dispatchResult] = useReducer(resultReducer, {
    selectedResult: 'win',
    rating: 5
  });
  
  // State for result submission
  const [resultSubmitted, setResultSubmitted] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Function to handle notifications
  const showNotification = useCallback((message: string, type: 'error' | 'success' | 'warning') => {
    setNotification({ message, type });
    
    // Auto-clear success notifications after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  }, []);
  
  // Function to clear notification
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);
  
  // Add friend
  const addFriend = useCallback((playerId: string) => {
    dispatchFriend({ type: 'ADD_FRIEND', payload: playerId });
  }, []);
  
  // Handle kick player dialog
  const handleKickPlayerClick = useCallback((playerId: string, playerName: string) => {
    dispatchDialog({ 
      type: 'SHOW_KICK_DIALOG', 
      payload: { 
        playerId, 
        playerName 
      } 
    });
  }, []);
  
  // Close kick player dialog
  const closeKickPlayerDialog = useCallback(() => {
    dispatchDialog({ type: 'HIDE_KICK_DIALOG' });
  }, []);
  
  // Execute kick player
  const handleKickPlayer = useCallback(async () => {
    if (!sessionData || !dialogState.kickPlayerId) return;
    
    try {
      await SessionService.kickPlayer(sessionData.id, dialogState.kickPlayerId);
      
      showNotification(`Successfully kicked ${dialogState.kickPlayerName} from the session`, 'success');
      
      // Refresh session to update player list
      refreshSession();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      showNotification('Error kicking player: ' + errorMessage, 'error');
    }
  }, [sessionData, dialogState.kickPlayerId, dialogState.kickPlayerName, showNotification, refreshSession]);
  
  // Recreate session with same team
  const recreateSession = useCallback(async () => {
    if (!sessionData) return;
    
    try {
      // Check if all players have reported results, accounting for the host's local submission
      // If the host has submitted locally, consider them as reported even if server hasn't updated
      const allPlayersReported = sessionData.joinedPlayers.every(player => {
        // If this is the current user (host) and they've submitted locally, treat as reported
        if (player.userId === userData?.id && resultSubmitted) {
          return true;
        }
        // Otherwise use the server data
        return player.hasReported === true;
      });
      
      if (!allPlayersReported) {
        showNotification("Cannot create new session until all players have reported results", 'warning');
        return;
      }
      
      setIsCreatingNewSession(true);
      // Navigate to the character selection page
      router.push(`/sessions/recreate?id=${sessionData.id}`);
    } catch (err) {
      showNotification("Unable to navigate to recreation page: " + err, 'error');
    } finally {
      setIsCreatingNewSession(false);
    }
  }, [sessionData, router, showNotification, userData, resultSubmitted]);
  
  // Function to handle result submission
  const handleSubmitResult = useCallback(async () => {
    // Check for all reasons that would prevent submission
    if (!sessionData || !userData) return;
    
    // Check if already submitted
    if (resultSubmitted) {
      throw new Error('Result already submitted');
    }
    
    try {
      setSubmissionError(null);
      
      // Map the UI result value to the backend format
      let resultValue = '';
      switch (resultState.selectedResult) {
        case 'win':
          resultValue = 'Win';
          break;
        case 'loss':
          resultValue = 'Loss';
          break;
        case 'dc':
          resultValue = 'Disconnect';
          break;
        default:
          resultValue = 'Disconnect';
      }
      
      // Prepare submission data
      const submissionData = {
        userId: userData.id,
        result: resultValue,
        rating: resultState.rating,
        feedback: resultState.feedback || '',
        covenantName: userData.covenantName
      };
      
      // Set state to submitted immediately for better UI feedback
      setResultSubmitted(true);
      
      // Also update the session data to show this player has reported
      updatePlayerReportedStatus(userData.id, true);
      
      // Submit result
      await fetchWithAuth(`/api/v1/sessions/${sessionData.id}/results`, {
        method: 'POST',
        body: JSON.stringify(submissionData)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      
      // Check if this is an "already submitted" error
      if (errorMessage.toLowerCase().includes('already submitted') || 
          errorMessage.toLowerCase().includes('has already submitted')) {
        
        // Update UI to show submitted state
        setResultSubmitted(true);
        
      } else {
        // For other errors, show the error notification
        showNotification('Error submitting result: ' + errorMessage, 'error');
        setSubmissionError(errorMessage);
        
        // Revert the optimistic update
        setResultSubmitted(false);
        updatePlayerReportedStatus(userData.id, false);
      }
      
      // Rethrow all errors to let the component handle them
      throw err;
    }
  }, [sessionData, userData, resultState, resultSubmitted, fetchWithAuth, showNotification, updatePlayerReportedStatus]);
  
  // Handle cancel session
  const handleCancelSession = useCallback(async () => {
    if (!sessionData) return;
    
    try {
      // Show a loading notification
      showNotification('Cancelling session...', 'warning');
      
      // Call the API to cancel the session
      await cancelSession(sessionData.id);
      
      // Show success notification
      showNotification('Session cancelled successfully', 'success');
      
      // Redirect to sessions page
      router.push('/sessions');
    } catch (err) {
      showNotification('Error cancelling session: ' + err, 'error');
    }
  }, [sessionData, router, showNotification]);
  
  // Check if result state needs to be updated from server data
  useEffect(() => {
    if (sessionData && userData) {
      // Check if the current user has already submitted a result in the results array
      const userHasSubmittedResult = sessionData.results?.some(
        (result) => result.userId === userData.id
      );
      
      // If server indicates user has reported but local state doesn't reflect it,
      // update the local state
      if (userHasSubmittedResult && !resultSubmitted) {
        setResultSubmitted(true);
      }
    }
  }, [sessionData, userData, resultSubmitted]);
  
  // Make sure we're actually the host - moved after hooks
  if (!isHost()) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!sessionData) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
        <p className="font-bold">Session Not Found</p>
        <p>The requested session could not be found. Please check the session ID and try again.</p>
      </div>
    );
  }
  
  return (
    <>
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column for Desktop / Main Content for Mobile */}
        <div className="lg:col-span-2">
          {/* Players Section */}
          <div className="mb-6">
            <PlayerSection 
              sessionState={sessionState}
              sessionData={sessionData}
              currentUserId={userData?.id}
              isHostView={true}
              onKickPlayer={handleKickPlayerClick}
            />
          </div>

          {/* Mobile-only: Results Section - Only appears here on mobile screens */}
          <div className="block lg:hidden mb-6">
            {/* Report Your Result Section - Only shown after session is finished */}
            {sessionState.isSessionFinished ? (
              <ResultReportingSection
                resultState={resultState}
                dispatchResult={dispatchResult}
                sessionState={sessionState}
                onSubmitResult={handleSubmitResult}
                isSubmitted={resultSubmitted}
                submissionError={submissionError}
                sessionData={sessionData}
              />
            ) : (
              <SessionInfoSection
                sessionState={sessionState}
                sessionData={sessionData}
              />
            )}
          </div>

          {/* Session Control Buttons */}
          <SessionControlButtons 
            sessionState={sessionState}
            startSession={startSession}
            resetSession={resetSession}
            showConfirmDialog={() => dispatchDialog({ type: 'SHOW_CONFIRM' })}
            onRecreateSession={recreateSession}
            isNewSessionLoading={isCreatingNewSession}
            disabled={!sessionData}
            sessionData={sessionData}
            isHost={true}
            resultSubmitted={resultSubmitted}
            onCancelSession={!sessionState.isSessionStarted ? () => dispatchDialog({ type: 'SHOW_DELETE' }) : undefined}
          />
        </div>

        {/* Right Column for Desktop Only */}
        <div className="hidden lg:flex lg:col-span-1 flex-col h-full">
          {/* Report Your Result Section - Only shown after session is finished */}
          {sessionState.isSessionFinished ? (
            <ResultReportingSection
              resultState={resultState}
              dispatchResult={dispatchResult}
              sessionState={sessionState}
              onSubmitResult={handleSubmitResult}
              isSubmitted={resultSubmitted}
              submissionError={submissionError}
              sessionData={sessionData}
            />
          ) : (
            <SessionInfoSection
              sessionState={sessionState}
              sessionData={sessionData}
            />
          )}
        </div>
      </div>

      {/* Notification component */}
      <Notification 
        notification={notification} 
        onDismiss={clearNotification}
        className="mb-4"
      />

      {/* Dialogs */}
      <FinishSessionDialog 
        isOpen={dialogState.showConfirmDialog}
        onClose={() => dispatchDialog({ type: 'HIDE_CONFIRM' })}
        onConfirm={handleFinishSession}
      />
      
      <WarningDialog 
        isOpen={dialogState.showWarningDialog}
        onClose={() => dispatchDialog({ type: 'HIDE_WARNING' })}
      />
      
      <DeleteSessionDialog
        isOpen={dialogState.showDeleteDialog}
        onClose={() => dispatchDialog({ type: 'HIDE_DELETE' })}
        onConfirm={handleCancelSession}
      />
      
      <KickPlayerDialog
        isOpen={dialogState.showKickDialog}
        playerName={dialogState.kickPlayerName}
        onClose={closeKickPlayerDialog}
        onConfirm={handleKickPlayer}
      />
    </>
  );
} 