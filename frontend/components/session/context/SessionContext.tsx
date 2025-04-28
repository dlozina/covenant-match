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
  newSessionCreated?: boolean;
  newSessionCreatedId?: string;
}

// Define action type for sessionReducer
export type SessionAction = 
  | { type: 'START_SESSION' }
  | { type: 'FINISH_SESSION'; payload?: number }
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
  // Added for manual updates of session data
  updatePlayerReportedStatus: (userId: string, hasReported: boolean) => void;
  // WebSocket methods using compatible types
  subscribe: (eventType: string, handler: (data: unknown) => void) => (() => void);
  isConnected: () => boolean;
  sendMessage: (message: { message_type: string; data: Record<string, unknown> }) => boolean;
  // Register handlers for visibility changes
  registerVisibilityHandler: (id: string, handler: () => void) => void;
  unregisterVisibilityHandler: (id: string) => void;
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
  updatePlayerReportedStatus: () => {},
  subscribe: () => () => {},
  isConnected: () => false,
  sendMessage: () => false,
  registerVisibilityHandler: () => {},
  unregisterVisibilityHandler: () => {},
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
  
  // Create a ref to store visibility change handlers
  const visibilityHandlersRef = useRef<Record<string, () => void>>({});
  
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
    // Check for invalid values
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
      // Only log error for development, return default value for production
      if (process.env.NODE_ENV === 'development') {
        console.error('Invalid time value for formatting:', totalSeconds);
      }
      return '0m 00s';
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
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
    if (sessionState.isSessionStarted || !sessionId) {
      console.log('Cannot start session: already started or no sessionId', 
                  'isStarted:', sessionState.isSessionStarted, 
                  'sessionId:', sessionId);
      return;
    }
    
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
    // Calculate the current elapsed time accurately
    let finalDuration = sessionState.elapsedSeconds;
    
    // If we have a startTime reference, calculate elapsed time from there to ensure accuracy
    if (sessionStartTimeRef.current) {
      const now = Date.now();
      const calculatedElapsed = Math.floor((now - sessionStartTimeRef.current) / 1000);
      
      // Use the calculated value if it seems valid (i.e., not zero or negative)
      if (calculatedElapsed > 0) {
        finalDuration = calculatedElapsed;
        console.log(`Using calculated finalDuration: ${finalDuration}s`);
      }
    }

    // Ensure we never have a zero duration for a finished session
    if (finalDuration <= 0) {
      // Fallback to a minimum duration (1 second) if we somehow got zero
      finalDuration = Math.max(1, sessionState.elapsedSeconds);
      console.log(`Corrected zero finalDuration to: ${finalDuration}s`);
    }
    
    // Store the final duration and update state with the calculated duration
    dispatchSession({ 
      type: 'FINISH_SESSION', 
      payload: finalDuration // Pass the duration explicitly
    });
    
    // Mark session as finished in localStorage with accurate duration
    storageUtils.saveSessionFinish(finalDuration);
    
    // Send API request to end session on server
    if (sessionData) {
      // Use fetchWithAuth to ensure token is valid
      fetchWithAuth(`/api/v1/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          duration: finalDuration
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
          finalDuration: finalDuration, // Store finalDuration in sessionData too
          _version: Date.now() // Force re-render
        };
      });
      
      // Update timestamp to force re-render
      setLastEventTimestamp(Date.now());
    }
  }, [sessionState.elapsedSeconds, sessionId, sessionData, fetchWithAuth]);
  
  // Fetch session data on mount -> Important to do this first
  // Important when device wakes from sleep mode ex. when user returns to tab, iPad, iPhone etc.
  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setError("Invalid session ID");
      return;
    }
    
    // Clear any session cancellation data when loading a new session
    // This ensures we don't show old cancellation notifications for new sessions
    if (sessionStorage.getItem('sessionCancelled') === 'true') {
      // Check if this is a different session than the cancelled one
      const cancelledSessionId = sessionStorage.getItem('cancelledSessionId');
      if (!cancelledSessionId || cancelledSessionId !== sessionId) {
        // Different session, so clear the cancellation data
        console.log('Clearing old cancellation data when loading new session');
        sessionStorage.removeItem('sessionCancelled');
        sessionStorage.removeItem('cancelledSessionName');
        sessionStorage.removeItem('cancelTimestamp');
        sessionStorage.removeItem('cancelledSessionId');
      }
    }
    
    // Function to fetch session data
    const fetchSessionData = async () => {
      try {
        // Skip if we've fetched very recently (within 10 seconds)
        const now = Date.now();
        const lastFetchTime = lastSyncTimeRef.current;
        if (lastFetchTime && now - lastFetchTime < 10000) {
          console.log('Skipping session fetch - last fetch was less than 10 seconds ago');
          return;
        }
        
        setIsLoading(true);
        setError(null);

        // Update last sync time
        lastSyncTimeRef.current = now;
        
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
        
        // If we have local storage pendingNewSessionId and we're on that session page now,
        // clear it to prevent recreation notification issues
        const pendingSessionId = localStorage.getItem('pendingNewSessionId');
        if (pendingSessionId && pendingSessionId === sessionId) {
          localStorage.removeItem('pendingNewSessionId');
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
            
            // After state update, notify any chat handlers that should update
            // Only trigger chat sync for meaningful changes
            setTimeout(() => {
              Object.entries(visibilityHandlersRef.current).forEach(([id, handler]) => {
                if (id.includes('chat_sync')) {
                  console.log(`Syncing chat handler ${id} after meaningful session update`);
                  try {
                    handler();
                  } catch (e) {
                    console.error(`Error in chat sync handler ${id}:`, e);
                  }
                }
              });
            }, 100);
            
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
              // Calculate elapsed time based on server timestamps if possible
              let calculatedDuration = sessionState.elapsedSeconds;
              if (data.startedAt && data.completedAt) {
                try {
                  const startTime = new Date(data.startedAt).getTime();
                  const endTime = new Date(data.completedAt).getTime();
                  if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
                    calculatedDuration = Math.floor((endTime - startTime) / 1000);
                    console.log(`Calculated session duration from server timestamps: ${calculatedDuration}s`);
                  }
                } catch (e) {
                  console.error('Error calculating duration from timestamps:', e);
                }
              }
              
              dispatchSession({ type: 'FINISH_SESSION', payload: calculatedDuration });
              storageUtils.saveSessionFinish(calculatedDuration);
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
        
        // Immediately check WebSocket connection and reconnect if needed
        if (!isConnected()) {
          console.log('WebSocket disconnected, reconnecting immediately...');
          reconnectWithFreshToken();
        }
        
        // Create a timestamp to track when we started processing
        const visibilityChangeTime = Date.now();
        
        // First fetch the session data
        fetchSessionData().then(() => {
          // After session data refresh, run chat handlers if needed
          const timeSinceVisChange = Date.now() - visibilityChangeTime;
          
          // Only process sync handlers if they're actually needed
          // If session data fetch took long, the chat sync might already be
          // taken care of via the changes detected in fetchSessionData
          if (timeSinceVisChange < 1000) {
            Object.entries(visibilityHandlersRef.current).forEach(([id, handler]) => {
              if (id.includes('chat_sync')) {
                console.log(`Running chat sync handler after visibility change: ${id}`);
                try {
                  handler();
                } catch (e) {
                  console.error(`Error in chat sync handler ${id}:`, e);
                }
              }
            });
          }
        }).catch(err => {
          console.error('Error fetching session data after visibility change:', err);
        });
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
      if (!data || typeof data !== 'object') return;
      
      // Extract player data
      const playerData = {
        username: typeof data === 'object' && data !== null && 'username' in data 
                  ? String(data.username) : 'Unknown Player',
        nightfarer: typeof data === 'object' && data !== null && 'nightfarer' in data 
                  ? String(data.nightfarer) : 'Unknown Nightfarer',
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
      if (!data || typeof data !== 'object') return;
      
      // Only update if not already finished
      if (sessionState.isSessionStarted && !sessionState.isSessionFinished) {
        // Calculate current elapsed time
        let calculatedDuration = sessionState.elapsedSeconds;
        if (sessionStartTimeRef.current) {
          const now = Date.now();
          const elapsed = Math.floor((now - sessionStartTimeRef.current) / 1000);
          if (elapsed > 0) {
            calculatedDuration = elapsed;
          }
        }
        
        // Store final duration
        dispatchSession({ type: 'FINISH_SESSION', payload: calculatedDuration });
        
        // Mark session as finished
        storageUtils.saveSessionFinish(calculatedDuration);
        
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
        
        // Capture session name for notification before updating state
        const sessionName = sessionData?.name || `Session #${sessionId}`;
        
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

        // For non-hosts, set cancellation info in storage and redirect
        if (!isHost()) {
          // Store in sessionStorage to be picked up by components
          sessionStorage.setItem('sessionCancelled', 'true');
          sessionStorage.setItem('cancelledSessionName', sessionName);
          sessionStorage.setItem('cancelTimestamp', Date.now().toString());
          sessionStorage.setItem('cancelledSessionId', sessionId);
          
          // Add a delay before redirecting to allow notification to appear
          setTimeout(() => {
            console.log('Host cancelled session, redirecting to sessions page...');
            router.push('/sessions');
          }, 3000);
        }
      }
    });
    
    // Handle player leave event
    const unsubscribeLeave = subscribe('leave', (data) => {
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
      if (!data || typeof data !== 'object') return;
      
      // Extract new session ID and original session ID with type assertions
      const newId = String((data as Record<string, unknown>).sessionId || '');
      const originalId = String((data as Record<string, unknown>).originalSessionId || '');
      
      if (newId && originalId === sessionId) {
        
        // Store the session ID in localStorage for persistence
        localStorage.setItem('pendingNewSessionId', newId);
        
        // Update session data with new session ID and set newSessionCreated flags
        setSessionData(prevData => {
          if (!prevData) return null;
          
          return {
            ...prevData,
            newSessionId: newId,
            newSessionCreated: true,
            newSessionCreatedId: newId,
            _version: Date.now() // Force re-render
          };
        });
        
        // Update timestamp to force re-render
        setLastEventTimestamp(Date.now());
        
        // Only for non-hosts: automatically navigate to the recreate page
        if (!isHost()) {
          // Store in sessionStorage for recreation page
          sessionStorage.setItem('autoJoinSessionId', newId);
          
          // Check feature flag for auto-redirect
          (async () => {
            try {
              // Import dynamically to avoid circular dependencies
              const { FeatureFlagService } = await import('@/utils/api/feature-flag-service');
              
              // Check if auto-redirect is disabled via feature flag
              // Always bypass cache to get the latest value
              const disableAutoRedirect = await FeatureFlagService.getFeatureFlagValue('disable_auto_redirect', true, true);
              
              if (disableAutoRedirect) {
                console.log('Feature flag: Auto-redirect disabled - use the notification link to join');
              } else {
                // NOTE: This is the ONLY place where auto-redirection should happen
                // We've consolidated the redirection logic here to avoid redundancy
                // Navigate after a short delay to allow state to update
                setTimeout(() => {
                  console.log('Redirecting to recreate page...');
                  router.push(`/sessions/recreate?id=${sessionId}`);
                }, 1500);
              }
            } catch (err) {
              console.error('Error checking feature flag, defaulting to disabled auto-redirect:', err);
              // Default behavior (no auto-redirect) if feature flag check fails
            }
          })();
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
    // WebSocket methods - wrap subscribe to add deduplication
    subscribe: (eventType: string, handler: (data: unknown) => void) => {
      // For chat messages, create a more optimized handler
      if (eventType === 'chat') {
        // Create a wrapper that prioritizes speed for chat messages
        const fastChatHandler = (data: unknown) => {
          // Quick validation only
          if (typeof data !== 'object' || data === null) {
            return;
          }
          
          // Call handler immediately - we'll do message-specific checks in the component
          handler(data);
        };
        
        // Return the subscription with fast chat handler
        return subscribe(eventType, fastChatHandler);
      } else {
        // For non-chat messages, use the original handler
        return subscribe(eventType, handler);
      }
    },
    isConnected,
    sendMessage: wsConnection.sendMessage,
    updatePlayerReportedStatus: (userId: string, hasReported: boolean) => {
      setSessionData(prevData => {
        if (!prevData) return null;
        
        const updatedPlayers = prevData.joinedPlayers.map(player => {
          if (player.userId === userId) {
            return {
              ...player,
              hasReported: hasReported
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
    },
    // Enhanced visibility change handlers with deduplication
    registerVisibilityHandler: (id: string, handler: () => void) => {
      // First log what handlers are currently registered
      const currentKeys = Object.keys(visibilityHandlersRef.current);
      console.log(`Registering visibility handler ${id}. Current handlers: ${currentKeys.join(', ')}`);
      
      // Check if we already have this handler to prevent duplicates
      if (id in visibilityHandlersRef.current) {
        console.log(`Handler ${id} already registered, replacing it`);
      }
      
      // Add the handler with debounce protection
      visibilityHandlersRef.current[id] = handler;
    },
    unregisterVisibilityHandler: (id: string) => {
      console.log(`Unregistering visibility handler ${id}`);
      delete visibilityHandlersRef.current[id];
    }
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
    handleFinishSession,
    subscribe,
    isConnected,
    wsConnection.sendMessage,
    setSessionData,
    visibilityHandlersRef
  ]);
  
  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
} 