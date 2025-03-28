'use client'
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
import { useAuth } from "@/lib/auth-context";
import { useRealTimeUpdates } from "@/hooks/useEventSource";
import { Notification, NotificationType } from "@/components/ui/notification";

// Define the session data interface
interface JoinedPlayer {
  userId: string;
  username: string;
  nightfarer: string;
  joinedAt: string;
  hasReported?: boolean;
}

interface SessionData {
  id: string;
  name: string;
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
  return (
    <ProtectedRoute>
      <SessionRunContent />
    </ProtectedRoute>
  );
}

function SessionRunContent(): JSX.Element {
  // Get session ID from query parameters
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id') || "unknown";
  
  // Check if session ID is valid
  const isValidSessionId = sessionId !== "unknown" && sessionId.length > 0;
  
  // State for session data from API
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for notifications
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // Get user data and fetchWithAuth from auth context
  const { userData, fetchWithAuth } = useAuth();
  
  // Initialize real-time updates connection
  const { subscribe, isConnected, disconnect, reconnectWithFreshToken } = useRealTimeUpdates(sessionId);
  
  // State for connection status
  const [rtConnected, setRtConnected] = useState<boolean>(false);
  
  // State to track which players have reported results - not used anymore as we store this directly in sessionData
  // const [reportedResults, setReportedResults] = useState<Set<string>>(new Set());
  
  // Function to check if current user is the host
  const isHost = useCallback(() => {
    if (!sessionData || !userData) return false;
    return sessionData.hostId === userData.id;
  }, [sessionData, userData]);
  
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
  
  // State for heartbeat indication (for testing real-time updates)
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  
  // State for tracking recreation of a session
  const [isCreatingNewSession, setIsCreatingNewSession] = useState<boolean>(false);
  const [newSessionId, setNewSessionId] = useState<string | null>(null);
  const router = useRouter();
  
  // State for result submission
  const [resultSubmitted, setResultSubmitted] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Store original player info to use when auto-joining new sessions
  const playerInfoRef = useRef<{nightfarer: string} | null>(null);
  
  // Use reducers for related state groups
  const [sessionState, dispatchSession] = useReducer(sessionReducer, initialSessionState);
  const [friendState, dispatchFriend] = useReducer(friendStatusReducer, {} as FriendState);
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
      // Use fetchWithAuth to ensure token is valid
      fetchWithAuth(`/api/v1/sessions/${sessionId}/start`, {
        method: 'POST'
      }).catch(err => {
        showNotification('Error starting session: ' + err, 'error');
      });

      // Update sessionData for the host to reflect the new status
      setSessionData(prevData => {
        if (!prevData) return null;
        
        return {
          ...prevData,
          status: 'InProgress',
          startedAt: new Date().toISOString()
        };
      });
    }
  }, [sessionState.isSessionStarted, sessionId, isValidSessionId, sessionData, fetchWithAuth, showNotification]);
  
  // Handle finish session (memoized)
  const handleFinishSession = useCallback(() => {
    // Store the final duration and update state
    dispatchSession({ type: 'FINISH_SESSION' });
    dispatchDialog({ type: 'HIDE_CONFIRM' });
    
    // Mark session as finished in localStorage
    storageUtils.saveSessionFinish(sessionState.elapsedSeconds);
    
    // Send API request to end session on server
    if (sessionData) {
      // Use fetchWithAuth to ensure token is valid
      fetchWithAuth(`/api/v1/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          duration: sessionState.elapsedSeconds
        })
      }).catch(err => {
        showNotification('Error completing session: ' + err, 'error');
      });
      
      // Keep SSE connection alive for the host to receive real-time updates
      // about other players submitting their results
      // NOTE: We deliberately don't disconnect here anymore to continue receiving result updates
    }
  }, [sessionState.elapsedSeconds, sessionId, sessionData, fetchWithAuth, showNotification]);
  
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
  
  // Recreate session with same team (memoized)
  const recreateSession = useCallback(async () => {
    if (!isValidSessionId || !isHost() || !userData || !sessionData) return;
    
    try {
      setIsCreatingNewSession(true);
      // Instead of directly recreating the session, navigate to the character selection page
      router.push(`/sessions/recreate?id=${sessionId}`);
    } catch (err) {
      showNotification("Unable to navigate to recreation page: " + err, 'error');
    } finally {
      setIsCreatingNewSession(false);
    }
  }, [sessionId, isValidSessionId, isHost, userData, sessionData, router, setIsCreatingNewSession, showNotification]);
  
  // Fetch session data on mount
  useEffect(() => {
    if (!isValidSessionId) {
      setIsLoading(false);
      setError("Invalid session ID");
      return;
    }
    
    // Function to fetch session data
    const fetchSessionData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use fetchWithAuth to ensure token is valid
        const data = await fetchWithAuth<SessionData>(`/api/v1/sessions/${sessionId}`);
        
        // Ensure proper initialization of hasReported flag for all players
        if (data && data.joinedPlayers) {
          // Log the players' reported status
          console.log("Fetched session data - Player reported status:");
          data.joinedPlayers.forEach((player: JoinedPlayer) => {
            // Make sure hasReported is explicitly set to false if not provided by API
            if (player.hasReported === undefined) {
              player.hasReported = false;
            }
            console.log(`Player ${player.username} (${player.userId}): hasReported = ${player.hasReported}`);
          });
        }
        
        setSessionData(data);
      } catch (err) {
        showNotification('Error fetching session data: ' + err, 'error');
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initial fetch
    fetchSessionData();
    
  }, [isValidSessionId, sessionId, fetchWithAuth, showNotification]);
  
  // Set up SSE subscriptions
  useEffect(() => {
    if (!isValidSessionId) return;
    // DEBUG: Subscribe to all message types to catch any events coming in
    const unsubscribeMessage = subscribe('message', (data) => {
      // Check if this might be a join event based on data properties
      if (data && typeof data === 'object' && 'username' in data && 'nightfarer' in data) {
      }
    });
    
    // Subscribe to the join event
    const unsubscribeJoin = subscribe('join', (data) => {   
      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        return;
      }
      
      // Extract player data directly from the object
      const playerData = {
        username: typeof data === 'object' && data !== null && 'username' in data 
                  ? String(data.username) : 'Unknown Player',
        nightfarer: typeof data === 'object' && data !== null && 'nightfarer' in data 
                   ? String(data.nightfarer) : 'Unknown Class',
        userId: typeof data === 'object' && data !== null && 'userId' in data 
               ? String(data.userId) : `user-${Date.now()}`
      };
      // No toast notification - UI will update through session data changes
      
      // Update the session data with the new player
      setSessionData(prevData => {
        if (!prevData) {
          return null;
        }
        
        // Check if player already exists
        const players = prevData.joinedPlayers || [];
        const playerExists = players.some(p => p.userId === playerData.userId);
        
        if (!playerExists) {
          
          // Create new array with the new player
          const updatedPlayers = [
            ...players,
            {
              userId: playerData.userId,
              username: playerData.username,
              nightfarer: playerData.nightfarer,
              joinedAt: new Date().toISOString(),
              hasReported: false  // Explicitly set to false for new players
            }
          ];
          
          // Return updated state object (important to create a new object)
          return {
            ...prevData,
            joinedPlayers: updatedPlayers
          };
        } else {
          return prevData;
        }
      });
    });

    // Subscribe to the start event
    const unsubscribeStart = subscribe('start', (data) => {
      
      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        return;
      }
      
      // Only update session if it's not already started
      if (!sessionState.isSessionStarted) {
        // Set session as started
        dispatchSession({ type: 'START_SESSION' });
        
        // Record start time
        const startTime = Date.now();
        sessionStartTimeRef.current = startTime;
        lastSyncTimeRef.current = startTime;
        
        // Store in localStorage for persistence
        storageUtils.saveSessionStart(startTime, sessionId);
        
        // Update session data status if available
        setSessionData(prevData => {
          if (!prevData) return null;
          
          return {
            ...prevData,
            status: 'InProgress',
            startedAt: new Date().toISOString()
          };
        });
        
        // No toast notification needed - UI changes provide sufficient indication
      }
    });
    
    // Subscribe to the complete event
    const unsubscribeComplete = subscribe('complete', (data) => {

      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        return;
      }
      
      // Only update session if it's not already finished
      if (sessionState.isSessionStarted && !sessionState.isSessionFinished) {
        // Store the final duration
        dispatchSession({ type: 'FINISH_SESSION' });
        
        // Mark session as finished in localStorage
        storageUtils.saveSessionFinish(sessionState.elapsedSeconds);
        
        // Update session data status if available
        setSessionData(prevData => {
          if (!prevData) return null;
          
          return {
            ...prevData,
            status: 'Completed',
            completedAt: new Date().toISOString()
          };
        });
        
        // No toast notification needed - UI changes clearly indicate status
        
        // NOTE: We're not disconnecting from SSE here anymore to continue receiving result updates
        // This allows players to see who has submitted their results in real-time
      }
    });
    
    // Subscribe to the result event
    const unsubscribeResult = subscribe('result', (data) => {
      
      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        return;
      }
      
      // Use type assertion to access the properties safely
      const eventData = data as { reported?: string; result?: string };
      
      // Check if we have the reported user ID in the data
      if (eventData.reported) {
        // Get the user ID who reported their result
        const reportedUserId = eventData.reported;
        
        // todo: Log for debugging only
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Result event received by ${userData?.id === sessionData?.hostId ? 'HOST' : 'PLAYER'}`);
          console.log(`Player ${reportedUserId} has reported with result: ${eventData.result}`);
          console.log(`Current user is ${userData?.id}, Host is ${sessionData?.hostId}`);
          console.log(`Is host reporting: ${reportedUserId === sessionData?.hostId ? 'YES' : 'NO'}`);
          
          // Debug the current reported status of all players
          console.log('Current reported status of players:');
          sessionData?.joinedPlayers.forEach(player => {
            console.log(`Player ${player.username} (${player.userId}): ${player.hasReported ? 'REPORTED' : 'PENDING'}`);
          });
        }
        
        // Update the session data to mark the player as reported
        setSessionData(prevData => {
          if (!prevData) return null;
          
          // Create a new array of joined players with updated hasReported property
          const updatedPlayers = prevData.joinedPlayers.map(player => {
          // Only update the player who submitted the result
          const hasReported = player.userId === reportedUserId || (player.hasReported === true); // preserve existing reported status
            
            return {
              ...player,
              hasReported: hasReported
            };
          });
          
          return {
            ...prevData,
            joinedPlayers: updatedPlayers
          };
        });
        
      // No toast notification needed - badges provide visual feedback
      } 
    });
    
    // Add additional event subscriptions here as needed
    
    return () => {
      // Clean up subscriptions
      unsubscribeJoin();
      unsubscribeStart();
      unsubscribeComplete();
      unsubscribeResult();
      unsubscribeMessage(); // DEBUG: Clean up the generic message subscription
    };
  }, [isValidSessionId, sessionId, subscribe, sessionState.isSessionStarted, sessionState.isSessionFinished, sessionState.elapsedSeconds, disconnect, sessionData, userData, fetchWithAuth]);
  
  // Effect to handle page refresh detection and disconnect EventSource when truly unloading
  useEffect(() => {
    // Check if this is a page refresh by using a timestamp in sessionStorage
    const lastLoadTime = sessionStorage.getItem('lastPageLoadTime');
    const currentTime = Date.now().toString();
    
    // If lastLoadTime exists and it's recent (within last 3 seconds), it's likely a refresh
    if (lastLoadTime && (Date.now() - parseInt(lastLoadTime, 10)) < 3000) {
      // Clear session data on refresh
      storageUtils.clearSessionData();
      
      // Clear any stored new session ID on refresh to prevent stale state
      setNewSessionId(null);
    }
    
    // Update the last load time
    sessionStorage.setItem('lastPageLoadTime', currentTime);
    
    // Add beforeunload event listener to disconnect EventSource when page is actually closing
    const handleBeforeUnload = () => {
      if (sessionId) {
        disconnect();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Since we're simplifying for a single-page use case, we can always disconnect when component unmounts
      if (sessionId) {
        disconnect();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [disconnect, sessionId]);
  
  // Effect to reset result submission state when the session ID changes
  useEffect(() => {
    // Reset result submission state for a new session
    setResultSubmitted(false);
    setSubmissionError(null);
    
    // Reset newSessionId when changing sessions
    // This prevents showing the "join new session" button if we're already in a new session
    setNewSessionId(null);
    
    // Store the player character information for potential future recreate/join flows
    if (sessionData && userData) {
      const currentPlayer = sessionData.joinedPlayers.find(p => p.userId === userData.id);
      if (currentPlayer) {
        playerInfoRef.current = {
          nightfarer: currentPlayer.nightfarer
        };
      }
    }
    
  }, [sessionId, setResultSubmitted, setSubmissionError, sessionData, userData]);

  // Effect to handle direct navigations without going through the recreate flow
  useEffect(() => {
    // Check if we came from the recreate page by looking for a special flag
    const fromRecreatePage = sessionStorage.getItem('fromRecreatePage');
    
    if (!fromRecreatePage) {
      // If we didn't come from the recreate page, clear any autoJoin data
      // This prevents issues when users directly navigate to a session URL
      sessionStorage.removeItem('autoJoinSessionId');
      sessionStorage.removeItem('autoJoinCharacter');
    } else {
      // Remove the flag
      sessionStorage.removeItem('fromRecreatePage');
    }
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

  // Check connection status periodically
  useEffect(() => {
    if (!isValidSessionId) return;
    
    // Initial check after a short delay
    const initialCheckTimer = setTimeout(() => {
      const connected = isConnected();
      setRtConnected(connected);
    }, 2000);
    
    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const connected = isConnected();
      
      setRtConnected(connected);
    }, 5000);
    
    return () => {
      clearTimeout(initialCheckTimer);
      clearInterval(statusInterval);
    };
  }, [isConnected, isValidSessionId, rtConnected, userData, sessionData, sessionState.isSessionFinished]);

  // Listen for heartbeat events
  useEffect(() => {
    const handleHeartbeat = (event: Event) => {
      const customEvent = event as CustomEvent;
      setLastHeartbeat(customEvent.detail.timestamp);
    };
    
    window.addEventListener('sse-heartbeat', handleHeartbeat);
    
    return () => {
      window.removeEventListener('sse-heartbeat', handleHeartbeat);
    };
  }, []);

  // Store player info when we have session data
  useEffect(() => {
    if (sessionData && userData) {
      const currentPlayer = sessionData.joinedPlayers.find(p => p.userId === userData.id);
      if (currentPlayer) {
        playerInfoRef.current = {
          nightfarer: currentPlayer.nightfarer
        };
      }
    }
  }, [sessionData, userData]);

  // Function to handle result submission
  const handleSubmitResult = useCallback(async () => {
    // Check for all reasons that would prevent submission
    if (!sessionData || !userData) return;
    
    // Check if already submitted - throw an error to trigger the catch block in ResultReportingSection
    if (resultSubmitted) {
      console.log('Result already submitted, ignoring duplicate submission attempt');
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
          resultValue = 'Win'; // Default to Win if somehow we get an unexpected value
      }
      
      // Prepare submission data
      const submissionData = {
        userId: userData.id, // Use authenticated user's ID
        result: resultValue, // Properly mapped result value
        rating: resultState.rating,
        feedback: resultState.feedback || ''
      };
      
      // Use fetchWithAuth to ensure token is valid
      await fetchWithAuth(`/api/v1/sessions/${sessionId}/results`, {
        method: 'POST',
        body: JSON.stringify(submissionData)
      });
      
      // Mark as submitted
      setResultSubmitted(true);
      
      // Update session data to mark current user as reported
      setSessionData(prevData => {
        if (!prevData) return null;
        
        // Update the joined players array with hasReported flag for current user
        const updatedPlayers = prevData.joinedPlayers.map(player => {
          
          return player.userId === userData.id 
            ? { ...player, hasReported: true }
            : player;
        });
        
        return {
          ...prevData,
          joinedPlayers: updatedPlayers
        };
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      
      // Check if this is an "already submitted" error
      if (errorMessage.toLowerCase().includes('already submitted') || 
          errorMessage.toLowerCase().includes('has already submitted')) {
        console.log('Handling already submitted error:', errorMessage);
        
        // Update UI to show submitted state even though we caught an error
        setResultSubmitted(true);
        
        // Update session data to mark current user as reported
        setSessionData(prevData => {
          if (!prevData) return null;
          
          // Update the joined players array with hasReported flag for current user
          const updatedPlayers = prevData.joinedPlayers.map(player => {
            return player.userId === userData.id 
              ? { ...player, hasReported: true }
              : player;
          });
          
          return {
            ...prevData,
            joinedPlayers: updatedPlayers
          };
        });
        
        // Rethrow the error so ResultReportingSection can also update its state
        throw err;
      } else {
        // For other errors, show the error notification and set the error message
        showNotification('Error submitting result: ' + errorMessage, 'error');
        setSubmissionError(errorMessage);
        
        // Rethrow all errors to let the component handle them
        throw err;
      }
    }
  }, [sessionId, userData, resultState, sessionData, resultSubmitted, fetchWithAuth, setSessionData, showNotification]);

  // Add a handler for "newSession" SSE events
  useEffect(() => {
    if (!isValidSessionId) return;
    
    // Subscribe to the newSession event
    const unsubscribeNewSession = subscribe('newSession', (data) => {
      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        return;
      }
      
      // Extract the new session ID and original session ID
      const newSessionId = typeof data === 'object' && data !== null && 'sessionId' in data 
                         ? String(data.sessionId) : null;
      
      const originalSessionId = typeof data === 'object' && data !== null && 'originalSessionId' in data 
                             ? String(data.originalSessionId) : null;
      
      // Only set newSessionId if:
      // 1. We have both a new and original session ID
      // 2. The current session matches the original session
      // 3. The new session is different from our current session
      if (newSessionId && originalSessionId && 
          originalSessionId === sessionId && 
          newSessionId !== sessionId) {
        
        // Store the new session ID in state (for the UI button)
        setNewSessionId(newSessionId);
      }
    });
    
    return () => {
      unsubscribeNewSession();
    };
  }, [isValidSessionId, subscribe, sessionId]);

  // Handle SSE connection changes
  useEffect(() => {
    if (isConnected()) {
      setRtConnected(true);
    } else {
      setRtConnected(false);
    }
  }, [isConnected]);

  // Add a visual indicator when a new session is available
  useEffect(() => {
    // Only non-hosts get the indicator (hosts create the session themselves)
    if (newSessionId && !isHost()) {
      // No action needed here - the UI will update based on newSessionId state
      // The "Start New Session With Same Team" button will be enabled and highlighted
    } else if (!newSessionId) {
      // No action needed here - the UI will update based on newSessionId state
    }
  }, [newSessionId, isHost]);

  // Add effect to handle connection management for EventSource
  useEffect(() => {
    if (!isValidSessionId) return;
    
    // Set up a timer to check connection status and reconnect if needed
    const connectionCheckInterval = setInterval(() => {
      // If we're not connected and we have a sessionId, try to reconnect
      if (!rtConnected && isValidSessionId) {
        console.log('EventSource disconnected, attempting to reconnect with fresh token');
        reconnectWithFreshToken();
      }
    }, 30000); // Check connection every 30 seconds
    
    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, [isValidSessionId, rtConnected, reconnectWithFreshToken]);

  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-10 mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl font-bold">
            {sessionData 
              ? `${sessionData.name}` 
              : 'Nightreign Session'}
          </h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-muted-foreground">Session ID: {isValidSessionId ? `#${sessionId.substring(0, 8)}` : ''}</span>
            
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${rtConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-muted-foreground">
                {rtConnected ? 'Connected (SSE)' : 'Disconnected'}
              </span>
            </div>
            
            {/* Heartbeat indicator */}
            {lastHeartbeat && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="animate-pulse text-sm text-red-500">❤️</span>
                <span>Last heartbeat: {new Date(lastHeartbeat * 1000).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notification component */}
        <Notification 
          notification={notification} 
          onDismiss={clearNotification}
          className="mb-4"
        />

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
                  />
                )}
              </div>

              {/* Session Control Buttons */}
              <SessionControlButtons 
                sessionState={sessionState}
                startSession={startSession}
                resetSession={resetSession}
                showConfirmDialog={() => dispatchDialog({ type: 'SHOW_CONFIRM' })}
                onRecreateSession={isHost() ? recreateSession : newSessionId ? async () => {
                  // For non-host players: navigate to the character selection page
                  if (newSessionId) {
                    // Store the session ID in sessionStorage so the recreate page can access it
                    sessionStorage.setItem('autoJoinSessionId', newSessionId);
                    
                    // Navigate to the recreate page
                    router.push(`/sessions/recreate?id=${sessionId}`);
                  }
                } : undefined}
                isNewSessionLoading={isCreatingNewSession}
                disabled={!isValidSessionId}
                sessionData={sessionData}
                isHost={isHost()}
                currentSessionId={sessionId}
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