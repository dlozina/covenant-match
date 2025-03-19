'use client'
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { toast } from "sonner";

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
  
  // Get user data from auth context
  const { userData } = useAuth();
  
  // Initialize real-time updates connection
  const { subscribe, isConnected, disconnect } = useRealTimeUpdates(sessionId);
  
  // State for connection status
  const [rtConnected, setRtConnected] = useState<boolean>(false);
  
  // State to track which players have reported results - not used anymore as we store this directly in sessionData
  // const [reportedResults, setReportedResults] = useState<Set<string>>(new Set());
  
  // Function to check if current user is the host
  const isHost = useCallback(() => {
    if (!sessionData || !userData) return false;
    return sessionData.hostId === userData.id;
  }, [sessionData, userData]);
  
  // State for heartbeat indication (for testing real-time updates)
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  
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
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      fetch(`${apiBaseUrl}/api/v1/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      fetch(`${apiBaseUrl}/api/v1/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          duration: sessionState.elapsedSeconds
        })
      }).catch(err => {
        console.error('Error completing session:', err);
      });
      
      // Keep SSE connection alive for the host to receive real-time updates
      // about other players submitting their results
      console.log('Session finished, but keeping SSE connection alive for result updates');
      
      // NOTE: We deliberately don't disconnect here so the host can see when other players report results
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

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const token = localStorage.getItem('token');
        
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
    
    // Initial fetch
    fetchSessionData();
    
  }, [isValidSessionId, sessionId]);
  
  // Set up SSE subscriptions
  useEffect(() => {
    if (!isValidSessionId) return;
    
    console.log(`Setting up SSE subscriptions for session: ${sessionId}`);
    
    // DEBUG: Subscribe to all message types to catch any events coming in
    const unsubscribeMessage = subscribe('message', (data) => {
      console.log('Generic message event received:', data);
      // Check if this might be a join event based on data properties
      if (data && typeof data === 'object' && 'username' in data && 'nightfarer' in data) {
        console.log('This appears to be a join event coming through as a generic message:', data);
      }
    });
    
    // Subscribe to the join event
    const unsubscribeJoin = subscribe('join', (data) => {
      console.log('Join event received:', data);
      
      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        console.error('Join event handler received invalid data:', data);
        return;
      }
      
      // Log the data structure for debugging
      console.log('Join event data structure:', {
        dataType: typeof data,
        hasUsername: 'username' in data,
        hasNightfarer: 'nightfarer' in data,
        hasUserId: 'userId' in data,
        rawData: data
      });
      
      // Extract player data directly from the object
      const playerData = {
        username: typeof data === 'object' && data !== null && 'username' in data 
                  ? String(data.username) : 'Unknown Player',
        nightfarer: typeof data === 'object' && data !== null && 'nightfarer' in data 
                   ? String(data.nightfarer) : 'Unknown Class',
        userId: typeof data === 'object' && data !== null && 'userId' in data 
               ? String(data.userId) : `user-${Date.now()}`
      };
      
      console.log(`Processing join for player: ${playerData.username} as ${playerData.nightfarer}`);
      
      // Show toast notification
      toast.info(`${playerData.username} joined as ${playerData.nightfarer}`);
      
      // Update the session data with the new player
      setSessionData(prevData => {
        if (!prevData) {
          console.log('No previous session data, skipping update');
          return null;
        }
        
        console.log('Updating session data with new player:', playerData);
        
        // Check if player already exists
        const players = prevData.joinedPlayers || [];
        const playerExists = players.some(p => p.userId === playerData.userId);
        
        if (!playerExists) {
          console.log('Adding new player to joinedPlayers array');
          
          // Create new array with the new player
          const updatedPlayers = [
            ...players,
            {
              userId: playerData.userId,
              username: playerData.username,
              nightfarer: playerData.nightfarer,
              joinedAt: new Date().toISOString()
            }
          ];
          
          // Return updated state object (important to create a new object)
          return {
            ...prevData,
            joinedPlayers: updatedPlayers
          };
        } else {
          console.log('Player already exists in session');
          return prevData;
        }
      });
    });

    // Subscribe to the start event
    const unsubscribeStart = subscribe('start', (data) => {
      console.log('Start event received:', data);
      
      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        console.error('Start event handler received invalid data:', data);
        return;
      }
      
      // Log the data structure for debugging
      console.log('Start event data structure:', {
        dataType: typeof data,
        hasSessionId: 'sessionId' in data,
        hasUserId: 'userId' in data,
        hasSessionStatus: 'sessionStatus' in data,
        rawData: data
      });
      
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
      console.log('Complete event received:', data);
      
      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        console.error('Complete event handler received invalid data:', data);
        return;
      }
      
      // Log the data structure for debugging
      console.log('Complete event data structure:', {
        dataType: typeof data,
        hasSessionId: 'sessionId' in data,
        hasUserId: 'userId' in data,
        hasSessionStatus: 'sessionStatus' in data,
        rawData: data
      });
      
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
      console.log('Result event received:', data);
      
      // Safety check for data structure
      if (!data || typeof data !== 'object') {
        console.error('Result event handler received invalid data:', data);
        return;
      }
      
      // Log the data structure for debugging
      console.log('Result event data structure:', data);
      
      // Use type assertion to access the properties safely
      const eventData = data as { reported?: string; result?: string };
      
      // Check if we have the reported user ID in the data
      if (eventData.reported) {
        // Get the user ID who reported their result
        const reportedUserId = eventData.reported;
        
        // Log for debugging only
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Result event received by ${userData?.id === sessionData?.hostId ? 'HOST' : 'PLAYER'}`);
          console.log(`Player ${reportedUserId} has reported with result: ${eventData.result}`);
          console.log(`Current user is ${userData?.id}, Host is ${sessionData?.hostId}`);
        }
        
        // Update the session data to mark the player as reported
        setSessionData(prevData => {
          if (!prevData) return null;
          
          // Create a new array of joined players with updated hasReported property
          const updatedPlayers = prevData.joinedPlayers.map(player => {
            // Only update the player who submitted the result
            const hasReported = player.userId === reportedUserId || 
                               (player.hasReported === true); // preserve existing reported status
            
            if (player.userId === reportedUserId) {
              console.log(`Marking player ${player.username} (${player.userId}) as reported`);
            }
            
            return {
              ...player,
              hasReported: hasReported
            };
          });
          
          console.log('Updated players data:', updatedPlayers);
          
          return {
            ...prevData,
            joinedPlayers: updatedPlayers
          };
        });
        
        // No toast notification needed - badges provide visual feedback
      } else {
        console.warn('Result event missing reported user ID:', eventData);
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
  }, [isValidSessionId, sessionId, subscribe, sessionState.isSessionStarted, sessionState.isSessionFinished, sessionState.elapsedSeconds, disconnect, sessionData, userData]);
  
  // Effect to handle page refresh detection and disconnect EventSource when truly unloading
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
    
    // Add beforeunload event listener to disconnect EventSource when page is actually closing
    const handleBeforeUnload = () => {
      console.log('Page is unloading, disconnecting EventSource');
      if (sessionId) {
        disconnect();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      console.log('Run page component unmounting, disconnecting EventSource');
      // Since we're simplifying for a single-page use case, we can always disconnect when component unmounts
      if (sessionId) {
        disconnect();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [disconnect, sessionId]);
  
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
      console.log(`Initial SSE connection check: ${connected ? 'Connected' : 'Disconnected'}`);
    }, 2000);
    
    // Check connection status periodically
    const statusInterval = setInterval(() => {
      const connected = isConnected();
      
      // Only log status changes to reduce console noise
      if (connected !== rtConnected) {
        console.log(`SSE connection status changed: ${connected ? 'Connected' : 'Disconnected'}`);
        console.log(`User role: ${userData?.id === sessionData?.hostId ? 'HOST' : 'PLAYER'}`);
        console.log(`Session status: ${sessionState.isSessionFinished ? 'FINISHED' : 'IN PROGRESS'}`);
      }
      
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

  // State for result submission feedback
  const [resultSubmitted, setResultSubmitted] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Function to handle result submission
  const handleSubmitResult = useCallback(async () => {
    if (!sessionData || !userData || resultSubmitted) return;
    
    try {
      setSubmissionError(null);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
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
      
      console.log('Submitting session result:', submissionData);
      console.log(`Submission by ${userData.id === sessionData.hostId ? 'HOST' : 'PLAYER'}`);
      console.log(`SSE connection status: ${isConnected() ? 'Connected' : 'Disconnected'}`);
      
      // Send API request to submit result
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions/${sessionId}/results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit result');
      }
      
      // Mark as submitted
      setResultSubmitted(true);
      
      // Update session data to mark current user as reported
      setSessionData(prevData => {
        if (!prevData) return null;
        
        // Update the joined players array with hasReported flag for current user
        const updatedPlayers = prevData.joinedPlayers.map(player => {
          const isCurrentUser = player.userId === userData.id;
          console.log(`Setting player ${player.username} (${player.userId}) hasReported = ${isCurrentUser || player.hasReported}`);
          
          return player.userId === userData.id 
            ? { ...player, hasReported: true }
            : player;
        });
        
        console.log('Updated players data after self-submission:', updatedPlayers);
        
        return {
          ...prevData,
          joinedPlayers: updatedPlayers
        };
      });
      
      console.log('Submission successful - updated UI state');
      
      // Success is indicated by the UI changing to show submitted state
      // No toast notification needed
      
    } catch (err) {
      console.error('Error submitting result:', err);
      setSubmissionError(err instanceof Error ? err.message : 'An unknown error occurred');
      // Keep error toast as it's important for user feedback when things go wrong
      toast.error('Failed to submit result. Please try again.');
    }
  }, [sessionId, userData, resultState, sessionData, resultSubmitted, setSessionData, isConnected]);

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
                sessionData={sessionData}
                isHost={isHost()}
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