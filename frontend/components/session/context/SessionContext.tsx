import { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRealTimeUpdates } from '@/hooks/useEventSource';
import { useWebSocketUpdates } from '@/hooks/useWebSocket';
import { initialSessionState, sessionReducer } from '../SessionReducers';
import { useReducer } from 'react';
import { storageUtils } from '../SessionUtils';
import { useRouter } from 'next/navigation';
import realtimeConfig from '@/config/realtimeConfig';

// Define joined player interface
export interface JoinedPlayer {
  userId: string;
  username: string;
  nightfarer: string;
  joinedAt: string;
  hasReported?: boolean;
  covenantName?: string;
}

export interface Result {
  userId: string;
  result: string;
  rating: number;
  feedback: string;
  submittedAt: string;
}

// Define session data interface
export interface SessionData {
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
  results?: Result[];
  _version?: number; // Used to force re-renders
  newSessionId?: string; // Track ID of new session created by host
}

// Define action type for sessionReducer
export type SessionAction = 
  | { type: 'START_SESSION' }
  | { type: 'FINISH_SESSION' }
  | { type: 'RESET_SESSION' }
  | { type: 'UPDATE_ELAPSED'; payload: number }
  | { type: 'RESTORE_SESSION'; payload: { isSessionStarted: boolean; isSessionFinished?: boolean; elapsedSeconds?: number; finalDuration?: number } };

// Define the session context interface
interface SessionContextType {
  sessionData: SessionData | null;
  isLoading: boolean;
  error: string | null;
  lastEventTimestamp: number;
  lastHeartbeat: number | null;
  sessionState: typeof initialSessionState;
  dispatchSession: React.Dispatch<SessionAction>;
  isHost: () => boolean;
  rtConnected: boolean;
  formatTime: (seconds: number) => string;
  resetSession: () => void;
  startSession: () => void;
  handleFinishSession: () => void;
}

// Create the context with a default value
export const SessionContext = createContext<SessionContextType>({
  sessionData: null,
  isLoading: true,
  error: null,
  lastEventTimestamp: Date.now(),
  lastHeartbeat: null,
  sessionState: initialSessionState,
  dispatchSession: () => {},
  isHost: () => false,
  rtConnected: false,
  formatTime: () => '',
  resetSession: () => {},
  startSession: () => {},
  handleFinishSession: () => {},
});

// Custom hook to use the session context
export const useSessionContext = () => useContext(SessionContext);

// SessionEventManager component
export function SessionEventManager({ 
  sessionId, 
  children 
}: { 
  sessionId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  
  // State
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<number>(Date.now());
  const [rtConnected, setRtConnected] = useState<boolean>(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  
  // Reducers
  const [sessionState, dispatchSession] = useReducer(sessionReducer, initialSessionState);
  
  // References - wrap in useRef instead of plain objects
  const sessionStartTimeRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number | null>(null);
  
  // Get auth context
  const { userData, fetchWithAuth } = useAuth();
  
  // Initialize real-time updates connection based on configuration
  const useWs = realtimeConfig.useWebSockets;
  
  // Use WebSockets or SSE based on configuration
  const wsConnection = useWebSocketUpdates(useWs ? sessionId : null);
  const sseConnection = useRealTimeUpdates(!useWs ? sessionId : null);
  
  // Use the appropriate connection based on configuration
  const { subscribe, isConnected, disconnect, reconnectWithFreshToken } = 
    useWs ? wsConnection : sseConnection;
  
  // Log the connection type
  useEffect(() => {
    console.log(`Using ${useWs ? 'WebSockets' : 'Server-Sent Events'} for real-time communication`);
  }, [useWs]);
  
  // Format time function - memoized
  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  }, []);
  
  // Check if current user is host - memoized
  const isHost = useCallback((): boolean => {
    if (!sessionData || !userData) return false;
    return sessionData.hostId === userData.id;
  }, [sessionData, userData]);
  
  // Reset session - memoized
  const resetSession = useCallback((): void => {
    // Clear all session data
    storageUtils.clearSessionData();
    
    // Reset state
    dispatchSession({ type: 'RESET_SESSION' });
    
    sessionStartTimeRef.current = null;
    lastSyncTimeRef.current = null;
  }, []);
  
  // Start session - memoized
  const startSession = useCallback((): void => {
    if (sessionState.isSessionStarted || !sessionId) return;
    
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
        setError('Error starting session: ' + err);
      });

      // Update sessionData to reflect the new status
      setSessionData(prevData => {
        if (!prevData) return null;
        
        return {
          ...prevData,
          status: 'InProgress',
          startedAt: new Date().toISOString(),
          _version: Date.now() // Force re-render
        };
      });
      
      // Update timestamp to force re-render
      setLastEventTimestamp(Date.now());
    }
  }, [sessionState.isSessionStarted, sessionId, sessionData, fetchWithAuth]);
  
  // Handle finish session - memoized
  const handleFinishSession = useCallback((): void => {
    // Store the final duration and update state
    dispatchSession({ type: 'FINISH_SESSION' });
    
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
        setError('Error completing session: ' + err);
      });
      
      // Update sessionData to reflect the new status
      setSessionData(prevData => {
        if (!prevData) return null;
        
        return {
          ...prevData,
          status: 'Completed',
          completedAt: new Date().toISOString(),
          _version: Date.now() // Force re-render
        };
      });
      
      // Update timestamp to force re-render
      setLastEventTimestamp(Date.now());
    }
  }, [sessionState.elapsedSeconds, sessionId, sessionData, fetchWithAuth]);
  
  // Fetch session data on mount
  useEffect(() => {
    if (!sessionId) {
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
          data.joinedPlayers.forEach((player: JoinedPlayer) => {
            // Make sure hasReported is explicitly set to false if not provided by API
            if (player.hasReported === undefined) {
              player.hasReported = false;
            }
          });
        }
        
        // Compare with current state and update accordingly
        setSessionData(prevData => {
          if (!prevData) return data;
          
          // If status has changed or joinedPlayers count changed
          const statusChanged = prevData.status !== data.status;
          const playersChanged = prevData.joinedPlayers.length !== data.joinedPlayers.length;
          const resultsChanged = (prevData.results?.length || 0) !== (data.results?.length || 0);
          
          // Check if there are more substantive changes
          const startedChanged = prevData.startedAt !== data.startedAt;
          const completedChanged = prevData.completedAt !== data.completedAt;
          
          // If changes detected, apply all updates from server
          if (statusChanged || playersChanged || resultsChanged || startedChanged || completedChanged) {
            console.log('Session state refreshed from server - detected changes');
            
            // If session went from not started to started, update local state
            if (!prevData.startedAt && data.startedAt && data.status === 'InProgress') {
              dispatchSession({ type: 'START_SESSION' });
              const startTime = new Date(data.startedAt).getTime();
              sessionStartTimeRef.current = startTime;
              lastSyncTimeRef.current = startTime;
              storageUtils.saveSessionStart(startTime, sessionId);
            }
            
            // If session went from not finished to finished, update local state
            if (!prevData.completedAt && data.completedAt && data.status === 'Completed') {
              dispatchSession({ type: 'FINISH_SESSION' });
              storageUtils.saveSessionFinish(sessionState.elapsedSeconds);
            }
            
            // Make sure players' hasReported flags are properly synced with results
            const updatedData = { ...data };
            
            // Only process if the session has results
            if (data.results && data.results.length > 0) {
              // Create a set of user IDs who have reported results for quick lookup
              const reportedUserIds = new Set(data.results.map(result => result.userId));
              
              // Update the hasReported flag for each player based on results
              updatedData.joinedPlayers = data.joinedPlayers.map(player => ({
                ...player,
                hasReported: reportedUserIds.has(player.userId)
              }));
            }
            
            return {
              ...updatedData,
              _version: Date.now() // Force re-render
            };
          }
          
          return prevData;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initial fetch
    fetchSessionData();
    
    // Add Page Visibility API handler to refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing session state');
        
        // Check if WebSocket connection is active, reconnect if needed
        if (!isConnected()) {
          console.log('WebSocket disconnected, reconnecting...');
          reconnectWithFreshToken();
        }
        
        // Always fetch latest session data when returning to the page
        fetchSessionData();
      }
    };
    
    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, fetchWithAuth, isConnected, reconnectWithFreshToken, sessionState.elapsedSeconds]);
  
  // Set up event subscriptions
  useEffect(() => {
    if (!sessionId) return;
    
    // Handle player join event
    const unsubscribeJoin = subscribe('join', (data) => {
      console.log('JOIN EVENT RECEIVED:', data);  
      if (!data || typeof data !== 'object') return;
      
      // Extract player data
      const playerData = {
        username: typeof data === 'object' && data !== null && 'username' in data 
                  ? String(data.username) : 'Unknown Player',
        nightfarer: typeof data === 'object' && data !== null && 'nightfarer' in data 
                  ? String(data.nightfarer) : 'Unknown Class',
        userId: typeof data === 'object' && data !== null && 'userId' in data 
                ? String(data.userId) : `user-${Date.now()}`,
        covenantName: typeof data === 'object' && data !== null && 'covenantName' in data 
                  ? String(data.covenantName) : 'Unknown Covenant'
      };
      
      // Update session data with new player
      setSessionData(prevData => {
        if (!prevData) return null;
        
        // Check if player already exists
        const players = prevData.joinedPlayers || [];
        const playerExists = players.some(p => p.userId === playerData.userId);
        
        if (!playerExists) {
          // Create new player object
          const newPlayer = {
            userId: playerData.userId,
            username: playerData.username,
            nightfarer: playerData.nightfarer,
            covenantName: playerData.covenantName,
            joinedAt: new Date().toISOString(),
            hasReported: false
          };
          
          // Return updated state with new player and version
          return {
            ...prevData,
            joinedPlayers: [...players, newPlayer],
            _version: Date.now() // Force re-render
          };
        }
        
        return prevData;
      });
      
      // Update timestamp to force re-render
      setLastEventTimestamp(Date.now());
    });
    
    // Handle session start event
    const unsubscribeStart = subscribe('start', (data) => {
      console.log('START EVENT RECEIVED:', data);
      if (!data || typeof data !== 'object') return;
      
      // Only update if not already started
      if (!sessionState.isSessionStarted) {
        // Set session as started
        dispatchSession({ type: 'START_SESSION' });
        
        // Record start time
        const startTime = Date.now();
        sessionStartTimeRef.current = startTime;
        lastSyncTimeRef.current = startTime;
        
        // Store in localStorage
        storageUtils.saveSessionStart(startTime, sessionId);
        
        // Update session data
        setSessionData(prevData => {
          if (!prevData) return null;
          
          return {
            ...prevData,
            status: 'InProgress',
            startedAt: new Date().toISOString(),
            _version: Date.now() // Force re-render
          };
        });
        
        // Update timestamp to force re-render
        setLastEventTimestamp(Date.now());
      }
    });
    
    // Handle session complete event
    const unsubscribeComplete = subscribe('complete', (data) => {
      console.log('COMPLETE EVENT RECEIVED:', data);
      if (!data || typeof data !== 'object') return;
      
      // Only update if not already finished
      if (sessionState.isSessionStarted && !sessionState.isSessionFinished) {
        // Store final duration
        dispatchSession({ type: 'FINISH_SESSION' });
        
        // Mark session as finished
        storageUtils.saveSessionFinish(sessionState.elapsedSeconds);
        
        // Update session data
        setSessionData(prevData => {
          if (!prevData) return null;
          
          return {
            ...prevData,
            status: 'Completed',
            completedAt: new Date().toISOString(),
            _version: Date.now() // Force re-render
          };
        });
        
        // Update timestamp to force re-render
        setLastEventTimestamp(Date.now());
      }
    });
    
    // Handle result submission event
    const unsubscribeResult = subscribe('result', (data) => {
      console.log('RESULT EVENT RECEIVED:', data);
      if (!data || typeof data !== 'object') return;
      
      // Get reported user ID
      const eventData = data as { reported?: string; result?: string; userId?: string };
      
      // Check for user ID in both standard formats (reported or userId property)
      const reportedUserId = eventData.reported || eventData.userId;
      
      if (reportedUserId) {
        console.log(`Setting hasReported=true for user: ${reportedUserId}`);
        
        // Update session data
        setSessionData(prevData => {
          if (!prevData) return null;
          
          // Update player's reported status
          const updatedPlayers = prevData.joinedPlayers.map(player => {
            if (player.userId === reportedUserId) {
              console.log(`Updating player ${player.username} to hasReported=true`);
              return {
                ...player,
                hasReported: true
              };
            }
            return player;
          });
          
          return {
            ...prevData,
            joinedPlayers: updatedPlayers,
            _version: Date.now() // Force re-render
          };
        });
        
        // Update timestamp to force re-render
        setLastEventTimestamp(Date.now());
      }
    });
    
    // Handle session cancel event
    const unsubscribeCancel = subscribe('cancel', (data) => {
      console.log('CANCEL EVENT RECEIVED:', data);
      if (!data || typeof data !== 'object') return;
      
      // Get cancelled session ID
      const cancelledSessionId = typeof data === 'object' && data !== null && 'sessionId' in data 
                ? String(data.sessionId) : null;
      
      if (cancelledSessionId === sessionId) {
        // Clear session data
        storageUtils.clearSessionData();
        
        // Update session data
        setSessionData(prevData => {
          if (!prevData) return null;
          
          return {
            ...prevData,
            status: 'Cancelled',
            _version: Date.now() // Force re-render
          };
        });
        
        // Update timestamp to force re-render
        setLastEventTimestamp(Date.now());
        
        // Disconnect from SSE when session is cancelled
        disconnect();
      }
    });
    
    // Handle player leave event
    const unsubscribeLeave = subscribe('leave', (data) => {
      console.log('LEAVE EVENT RECEIVED:', data);
      if (!data || typeof data !== 'object') return;
      
      // Get user ID of leaving player
      const userId = typeof data === 'object' && data !== null && 'userId' in data 
            ? String(data.userId) : null;
      
      if (!userId) return;
      
      // Update session data
      setSessionData(prevData => {
        if (!prevData) return null;
        
        // Remove player from joined players
        const updatedPlayers = prevData.joinedPlayers.filter(player => player.userId !== userId);
        
        return {
          ...prevData,
          joinedPlayers: updatedPlayers,
          status: prevData.status === 'Full' ? 'Open' : prevData.status,
          _version: Date.now() // Force re-render
        };
      });
      
      // Update timestamp to force re-render
      setLastEventTimestamp(Date.now());
    });
    
    // Handle new session event
    const unsubscribeNewSession = subscribe('newSession', (data) => {
      console.log('NEW SESSION EVENT RECEIVED:', data);
      if (!data || typeof data !== 'object') return;
      
      // Extract new session ID and original session ID with type assertions
      const newId = String((data as Record<string, unknown>).sessionId || '');
      const originalId = String((data as Record<string, unknown>).originalSessionId || '');
      
      if (newId && originalId === sessionId) {
        console.log('New Session ID:', newId);
        
        // Store the session ID in localStorage for persistence
        localStorage.setItem('pendingNewSessionId', newId);
        
        // Update session data with new session ID
        setSessionData(prevData => {
          if (!prevData) return null;
          
          return {
            ...prevData,
            newSessionId: newId,
            _version: Date.now() // Force re-render
          };
        });
        
        // Update timestamp to force re-render
        setLastEventTimestamp(Date.now());
        
        // Only for non-hosts: automatically navigate to the recreate page
        if (!isHost()) {
          // Store in sessionStorage for recreation page
          sessionStorage.setItem('autoJoinSessionId', newId);
          
          // Navigate after a short delay to allow state to update
          setTimeout(() => {
            console.log('Redirecting to recreate page...');
            router.push(`/sessions/recreate?id=${sessionId}`);
          }, 1500);
        }
      }
    });
    
    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setRtConnected(isConnected());
    }, 5000);
    
    return () => {
      // Clean up subscriptions
      unsubscribeJoin();
      unsubscribeStart();
      unsubscribeComplete();
      unsubscribeResult();
      unsubscribeCancel();
      unsubscribeLeave();
      unsubscribeNewSession();
      clearInterval(statusInterval);
      
      // Disconnect when component unmounts
      disconnect();
    };
  }, [
    sessionId, 
    subscribe, 
    isConnected, 
    sessionState.isSessionStarted, 
    sessionState.isSessionFinished, 
    sessionState.elapsedSeconds,
    disconnect,
    isHost,
    router
  ]);
  
  // Handle heartbeat events
  useEffect(() => {
    if (!sessionId) return;
    
    const heartbeatEventName = useWs ? 'ws-heartbeat' : 'sse-heartbeat';
    
    const handleHeartbeat = (event: Event) => {
      const customEvent = event as CustomEvent;
      setLastHeartbeat(customEvent.detail.timestamp);
    };
    
    window.addEventListener(heartbeatEventName, handleHeartbeat);
    
    return () => {
      window.removeEventListener(heartbeatEventName, handleHeartbeat);
    };
  }, [sessionId, useWs]);
  
  // Handle connection changes
  useEffect(() => {
    setRtConnected(isConnected());
    
    // Set up reconnection timer
    const reconnectionTimer = setInterval(() => {
      if (!rtConnected && sessionId) {
        console.log('Attempting to reconnect with fresh token');
        reconnectWithFreshToken();
      }
    }, 30000);
    
    return () => {
      clearInterval(reconnectionTimer);
    };
  }, [isConnected, reconnectWithFreshToken, rtConnected, sessionId]);
  
  // Create context value
  const contextValue = useMemo(() => ({
    sessionData,
    isLoading,
    error,
    lastEventTimestamp,
    lastHeartbeat,
    sessionState,
    dispatchSession,
    isHost,
    rtConnected,
    formatTime,
    resetSession,
    startSession,
    handleFinishSession,
  }), [
    sessionData,
    isLoading,
    error,
    lastEventTimestamp,
    lastHeartbeat,
    sessionState,
    rtConnected,
    formatTime,
    isHost,
    resetSession,
    startSession, 
    handleFinishSession
  ]);
  
  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
} 