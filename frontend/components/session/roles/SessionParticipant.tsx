import { useCallback, useReducer, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { 
  PlayerSection,
  SessionControlButtons,
  SessionInfoSection,
  ResultReportingSection,
  WarningDialog
} from "@/components/session";
import {
  friendStatusReducer,
  dialogReducer,
  resultReducer,
  FriendState,
  DialogState
} from "@/components/session/SessionReducers";
import { leaveSession } from "@/utils/api";
import { Notification, NotificationType } from "@/components/ui/notification";
import { useSessionContext } from "../context/SessionContext";

export function SessionParticipant() {
  const router = useRouter();
  
  // Get session context
  const {
    sessionData,
    sessionState,
    isLoading,
    error,
    isHost,
    formatTime,
    resetSession,
    updatePlayerReportedStatus,
    lastHeartbeat
  } = useSessionContext();
  
  // Get auth context - moved before conditional return
  const { userData, fetchWithAuth } = useAuth();
  
  // State for notifications
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // Reducers for UI state
  const [friendState, dispatchFriend] = useReducer(friendStatusReducer, {} as FriendState);
  const [dialogState, dispatchDialog] = useReducer(dialogReducer, {
    showConfirmDialog: false,
    showWarningDialog: false,
    showDeleteDialog: false
  } as DialogState);
  const [resultState, dispatchResult] = useReducer(resultReducer, {
    selectedResult: 'win',
    rating: 5
  });
  
  // State for result submission
  const [resultSubmitted, setResultSubmitted] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // State for new session
  const [newSessionId, setNewSessionId] = useState<string | null>(null);
  // Track if we've already shown notification for new session
  const [hasShownNewSessionNotification, setHasShownNewSessionNotification] = useState<boolean>(false);
  
  // Function to handle notifications
  const showNotification = useCallback((message: string | JSX.Element, type: 'error' | 'success' | 'warning', persist: boolean = false) => {
    setNotification({ message, type });
    
    // Auto-clear success notifications after 5 seconds, unless persist is true
    if (type === 'success' && !persist) {
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
  
  // Join new session created by host
  const joinNewSession = useCallback(() => {
    if (!newSessionId) return;
    
    // Store in sessionStorage for recreation page
    sessionStorage.setItem('autoJoinSessionId', newSessionId);
    
    // Clear the pending session ID from localStorage
    localStorage.removeItem('pendingNewSessionId');
    
    // Navigate to recreate
    router.push(`/sessions/recreate?id=${sessionData?.id}`);
  }, [newSessionId, router, sessionData]);
  
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
          resultValue = 'Disconnect'; // Default to Disconnect if somehow we get an unexpected value
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
      
      // Submit result to server
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
  
  // Handle leave session
  const handleLeaveSession = useCallback(async () => {
    if (!sessionData) return;
    
    try {
      // Show a loading notification
      showNotification('Leaving session...', 'warning');
      
      // Call the API to leave the session
      await leaveSession(sessionData.id);
      
      // Show success notification
      showNotification('Left session successfully', 'success');
      
      // Redirect to sessions page
      router.push('/sessions');
    } catch (err) {
      showNotification('Error leaving session: ' + err, 'error');
    }
  }, [sessionData, router, showNotification]);
  
  // Effect to detect when host has created a new session based on server data
  useEffect(() => {
    if (
      sessionData?.newSessionCreated && 
      sessionData.newSessionCreatedId && 
      !hasShownNewSessionNotification
    ) {
      // Save the new session ID
      setNewSessionId(sessionData.newSessionCreatedId);
      
      // Show notification with link to join the new session
      // Make notification type success but also persist longer for users waking from sleep
      setNotification({
        type: 'success',
        message: (
          <div>
            The host has created a new session. <Link href={`/sessions/recreate?id=${sessionData.id}`} className="underline font-bold">Click here</Link> to join the new session.
          </div>
        )
      });
      
      // Mark that we've shown the notification
      setHasShownNewSessionNotification(true);
      
      // Also store the ID in case the user refreshes
      localStorage.setItem('pendingNewSessionId', sessionData.newSessionCreatedId);
      
      // NOTE: We've removed the auto-redirect logic from here since it's handled in SessionContext.tsx
      // through the WebSocket/SSE newSession event. This avoids redundant redirection code.
    }
  }, [sessionData, hasShownNewSessionNotification]);
  
  // Additional effect to check for redirects that might have failed due to sleep mode
  useEffect(() => {
    // Check if newSessionCreated flag is true but we're still on this page
    // This indicates the automatic redirect might have failed
    if (
      sessionData?.newSessionCreated && 
      sessionData.newSessionCreatedId
    ) {
      // Check if we're already on the new session page
      if (
        window.location.href.includes(sessionData.newSessionCreatedId) ||
        window.location.href.includes(`/sessions/run?id=${sessionData.newSessionCreatedId}`)
      ) {
        // We're already on the new session page, clear the localStorage
        localStorage.removeItem('pendingNewSessionId');
      } else {
        // We're not on the new session page, show the notification
        const message = (
          <div className="font-medium">
            A new session is available. <Link href={`/sessions/recreate?id=${sessionData.id}`} className="underline font-bold">Click here</Link> to join the new session.
          </div>
        );
        showNotification(message, 'success', true);
      }
    }
  }, [sessionData, showNotification]);
  
  // Effect to update newSessionId when it changes in localStorage
  useEffect(() => {
    // Check if we have a pending new session ID
    const storedSessionId = localStorage.getItem('pendingNewSessionId');
    if (storedSessionId) {
      setNewSessionId(storedSessionId);
    }
    
    // Listen for storage changes to detect when a new session ID is added
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'pendingNewSessionId' && event.newValue) {
        setNewSessionId(event.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Check if result state needs to be updated from server data
  useEffect(() => {
    if (sessionData && userData) {
      // Find current user in joined players
      const currentUserPlayer = sessionData.joinedPlayers.find(
        player => player.userId === userData.id
      );
      
      // If server indicates user has reported but local state doesn't reflect it,
      // update the local state
      if (currentUserPlayer && currentUserPlayer.hasReported && !resultSubmitted) {
        console.log('Server indicates result was submitted, updating local state');
        setResultSubmitted(true);
      }
    }
  }, [sessionData, userData, resultSubmitted]);
  
  // Make sure we're not the host - moved after hooks
  if (isHost()) {
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
  
  // Check if the current user is a player in this session
  const isPlayerInSession = sessionData.joinedPlayers.some(player => player.userId === userData?.id);
  
  if (!isPlayerInSession) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
        <p className="font-bold">Not a Participant</p>
        <p>You are not a participant in this session.</p>
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
              friendState={friendState} 
              addFriend={addFriend}
              sessionData={sessionData}
              currentUserId={userData?.id}
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
                formatTime={formatTime}
                onSubmitResult={handleSubmitResult}
                isSubmitted={resultSubmitted}
                submissionError={submissionError}
              />
            ) : (
              <SessionInfoSection
                sessionState={sessionState}
                formatTime={formatTime}
                sessionData={sessionData}
                lastHeartbeat={lastHeartbeat}
              />
            )}
          </div>

          {/* Session Control Buttons */}
          <SessionControlButtons 
            sessionState={sessionState}
            startSession={undefined} // Participants can't start sessions
            resetSession={resetSession}
            showConfirmDialog={undefined} // Participants can't end sessions
            onRecreateSession={newSessionId ? joinNewSession : undefined}
            isNewSessionLoading={false}
            disabled={!sessionData}
            sessionData={sessionData}
            isHost={false}
            resultSubmitted={resultSubmitted}
            onLeaveSession={!sessionState.isSessionStarted ? handleLeaveSession : undefined}
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
              formatTime={formatTime}
              onSubmitResult={handleSubmitResult}
              isSubmitted={resultSubmitted}
              submissionError={submissionError}
            />
          ) : (
            <SessionInfoSection
              sessionState={sessionState}
              formatTime={formatTime}
              sessionData={sessionData}
              lastHeartbeat={lastHeartbeat}
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
      <WarningDialog 
        isOpen={dialogState.showWarningDialog}
        onClose={() => dispatchDialog({ type: 'HIDE_WARNING' })}
      />
    </>
  );
} 