'use client'
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { useSearchParams } from "next/navigation";
//import Link from "next/link";
import { 
  PlayerSection,
  SessionControlButtons,
  SessionInfoSection,
  ResultReportingSection,
  FinishSessionDialog,
  WarningDialog
} from "@/components/session/SessionComponents";
import {
  sessionReducer,
  initialSessionState,
  friendStatusReducer,
  dialogReducer,
  resultReducer,
  FriendState,
  DialogState,
  ResultState
} from "@/components/session/SessionReducers";
import { storageUtils } from "@/components/session/SessionUtils";
import { useSessionTimer } from "@/components/session/SessionHooks";

// Define the session data interface
interface JoinedPlayer {
  userId: string;
  username: string;
  nightfarer: string;
  joinedAt: string;
}

interface SessionData {
  id: string;
  hostId: string;
  status: string;
  nightLord: string;
  joinedPlayers: JoinedPlayer[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  password: string | null;
}

export default function SessionRunPage(): JSX.Element {
  // Get session ID from query parameters
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id') || "unknown";
  
  // Check if session ID is valid
  const isValidSessionId = sessionId !== "unknown" && sessionId.length > 0;
  
  // State for session data from API
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use reducers for related state groups
  const [sessionState, dispatchSession] = useReducer(sessionReducer, initialSessionState);
  const [friendState, dispatchFriend] = useReducer(friendStatusReducer, {
    'player2': false,
    'player3': false
  } as FriendState);
  const [dialogState, dispatchDialog] = useReducer(dialogReducer, {
    showConfirmDialog: false,
    showWarningDialog: false
  } as DialogState);
  const [resultState, dispatchResult] = useReducer(resultReducer, {
    selectedResult: 'win',
    rating: 5
  } as ResultState);
  
  // References
  const sessionStartTimeRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number | null>(null);
  
  // Memoized formatTime function
  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }, []);
  
  // Sync with server (memoized)
  const syncWithServer = useCallback(() => {
    // TODO: Implement server sync
    // This would be an API call to get the current session time from your backend
  }, []);
  
  // Session timer hook
  useSessionTimer(
    sessionState.isSessionStarted && !sessionState.isSessionFinished,
    useCallback((elapsed: number) => {
      dispatchSession({ type: 'UPDATE_ELAPSED', payload: elapsed });
      
      // Sync with server every 30 seconds
      const now = Date.now();
      if (lastSyncTimeRef.current && now - lastSyncTimeRef.current > 30000) {
        syncWithServer();
        lastSyncTimeRef.current = now;
      }
    }, [syncWithServer]),
    sessionStartTimeRef
  );
  
  // Start session (memoized)
  const startSession = useCallback(() => {
    if (sessionState.isSessionStarted || !isValidSessionId) return;
    
    // Set session as started
    dispatchSession({ type: 'START_SESSION' });
    
    // Record start time
    const startTime = Date.now();
    sessionStartTimeRef.current = startTime;
    lastSyncTimeRef.current = startTime;
    
    // Store in localStorage for persistence
    storageUtils.saveSessionStart(startTime, sessionId);
    
    // Send API request to start session on server
    if (sessionData) {
      fetch(`/api/v1/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }).catch(err => {
        console.error('Error starting session:', err);
      });
    }
  }, [sessionState.isSessionStarted, sessionId, isValidSessionId, sessionData]);
  
  // Handle finish session (memoized)
  const handleFinishSession = useCallback(() => {
    // Store the final duration and update state
    dispatchSession({ type: 'FINISH_SESSION' });
    dispatchDialog({ type: 'HIDE_CONFIRM' });
    
    // Mark session as finished in localStorage
    storageUtils.saveSessionFinish(sessionState.elapsedSeconds);
    
    // Send API request to end session on server
    if (sessionData) {
      fetch(`/api/v1/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: sessionState.elapsedSeconds
        })
      }).catch(err => {
        console.error('Error completing session:', err);
      });
    }
  }, [sessionState.elapsedSeconds, sessionId, sessionData]);
  
  // Reset session (memoized)
  const resetSession = useCallback(() => {
    // Clear all session data
    storageUtils.clearSessionData();
    
    // Reset state
    dispatchSession({ type: 'RESET_SESSION' });
    
    sessionStartTimeRef.current = null;
    lastSyncTimeRef.current = null;
  }, []);
  
  // Add friend (memoized)
  const addFriend = useCallback((playerId: string) => {
    dispatchFriend({ type: 'ADD_FRIEND', payload: playerId });
  }, []);
  
  // Effect to fetch session data from API
  useEffect(() => {
    if (!isValidSessionId) {
      setIsLoading(false);
      return;
    }

    const fetchSessionData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const token = localStorage.getItem('token');
        
        //todo: add toast
        // if (!token) {
        //   toast.error("Authentication required");
        //   router.push('/login');
        //   return;
        // }
        
        // Fetch session data from API
        const response = await fetch(`${apiBaseUrl}/api/v1/sessions/${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch session data: ${response.status}`);
        }
        
        const data = await response.json();
        setSessionData(data);
      } catch (err) {
        console.error('Error fetching session data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, isValidSessionId]);
  
  // Effect to handle page refresh detection
  useEffect(() => {
    // Check if this is a page refresh by using a timestamp in sessionStorage
    const lastLoadTime = sessionStorage.getItem('lastPageLoadTime');
    const currentTime = Date.now().toString();
    
    // If lastLoadTime exists and it's recent (within last 3 seconds), it's likely a refresh
    if (lastLoadTime && (Date.now() - parseInt(lastLoadTime, 10)) < 3000) {
      // Clear session data on refresh
      storageUtils.clearSessionData();
    }
    
    // Update the last load time
    sessionStorage.setItem('lastPageLoadTime', currentTime);
  }, []);
  
  // Effect to restore session from localStorage
  useEffect(() => {
    const { sessionId: storedSessionId, startTime, isFinished, finalDuration } = storageUtils.getStoredSession();
    
    // If the session ID doesn't match, reset everything
    if (storedSessionId && storedSessionId !== sessionId) {
      resetSession();
      return;
    }
    
    // If there's a finished session, just show the results
    if (isFinished && finalDuration) {
      dispatchSession({ 
        type: 'RESTORE_SESSION', 
        payload: {
          isSessionStarted: true, 
          isSessionFinished: true,
          finalDuration: parseInt(finalDuration, 10)
        }
      });
      return;
    }
    
    // Otherwise check for an active session
    if (startTime) {
      const startTimeNum = parseInt(startTime, 10);
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeNum) / 1000);
      
      // If there's a stored session that's not too old (e.g., less than 3 hours)
      if (elapsed < 10800) {
        sessionStartTimeRef.current = startTimeNum;
        
        dispatchSession({ 
          type: 'RESTORE_SESSION', 
          payload: {
            isSessionStarted: true,
            elapsedSeconds: elapsed
          }
        });
        
        // Sync with server immediately
        syncWithServer();
      } else {
        // Clear old session data
        resetSession();
      }
    }
  }, [resetSession, syncWithServer, sessionId]);
  
  // Effect to handle beforeunload warning
  useEffect(() => {
    // Add beforeunload event listener to warn about active sessions
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sessionState.isSessionStarted && !sessionState.isSessionFinished) {
        // Standard way to show a confirmation dialog when leaving the page
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Show warning dialog once when the page loads if there's an active session
    if (sessionState.isSessionStarted && !sessionState.isSessionFinished) {
      dispatchDialog({ type: 'SHOW_WARNING' });
    }
    
    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionState.isSessionStarted, sessionState.isSessionFinished]);
  
  // Effect to clean up session data on unmount if session is finished
  useEffect(() => {
    // Return cleanup function that runs when component unmounts
    return () => {
      // If session is finished, clear the session data from localStorage
      if (sessionState.isSessionFinished) {
        storageUtils.clearSessionData();
      }
    };
  }, [sessionState.isSessionFinished]);

  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-10 mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl font-bold">
            {sessionData 
              ? `${sessionData.nightLord} Session` 
              : 'Nightreign Session'}
          </h1>
          <span className="text-muted-foreground">Session ID: {isValidSessionId ? `#${sessionId.substring(0, 8)}` : ''}</span>
        </div>

        {!isValidSessionId && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p className="font-bold">Invalid Session</p>
            <p>No valid session ID was provided. Please check the URL and try again.</p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && sessionData && (
          /* Main Content */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2">
              {/* Players Section */}
              <PlayerSection 
                sessionState={sessionState} 
                friendState={friendState} 
                addFriend={addFriend}
                sessionData={sessionData}
              />

              {/* Session Control Buttons */}
              <SessionControlButtons 
                sessionState={sessionState}
                startSession={startSession}
                resetSession={resetSession}
                showConfirmDialog={() => dispatchDialog({ type: 'SHOW_CONFIRM' })}
                disabled={!isValidSessionId}
              />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 flex flex-col h-full">
              {/* Report Your Result Section - Only shown after session is finished */}
              {sessionState.isSessionFinished ? (
                <ResultReportingSection
                  resultState={resultState}
                  dispatchResult={dispatchResult}
                  sessionState={sessionState}
                  formatTime={formatTime}
                />
              ) : (
                <SessionInfoSection
                  sessionState={sessionState}
                  formatTime={formatTime}
                  sessionData={sessionData}
                />
              )}
            </div>
          </div>
        )}

        {!isLoading && !error && !sessionData && isValidSessionId && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
            <p className="font-bold">Session Not Found</p>
            <p>The requested session could not be found. Please check the session ID and try again.</p>
          </div>
        )}
      </div>

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
    </MainLayout>
  );
}