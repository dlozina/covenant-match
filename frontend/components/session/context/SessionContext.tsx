import { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useAuth } from '@/lib/auth-context';
import { useRealTimeUpdates } from '@/hooks/useEventSource';
import { useWebSocketUpdates } from '@/hooks/useWebSocket';
import { SessionData } from '../common/types';
import { useRouter } from 'next/navigation';
import realtimeConfig from '@/config/realtimeConfig';

// Define the session context interface
export interface SessionContextType {
  // Server state
  sessionData: SessionData | null;
  isLoading: boolean;
  error: string | null;
  lastHeartbeat: number | null;
  
  // UI state
  sessionState: {
    isSessionStarted: boolean;
    isSessionFinished: boolean;
    elapsedSeconds: number;
    finalDuration: number | null;
  };
  rtConnected: boolean;
  
  // Methods
  isHost: () => boolean;
  formatTime: (seconds: number) => string;
  resetSession: () => void;
  startSession: () => Promise<void>;
  handleFinishSession: () => Promise<void>;
  updatePlayerReportedStatus: (userId: string, hasReported: boolean) => void;
  refreshSession: () => void;
  
  // WebSocket methods
  subscribe: (eventType: string, handler: (data: unknown) => void) => (() => void);
  isConnected: () => boolean;
  sendMessage: (message: { message_type: string; data: Record<string, unknown> }) => boolean;
  
  // Visibility handlers for chat sync
  registerVisibilityHandler: (id: string, handler: () => void) => void;
  unregisterVisibilityHandler: (id: string) => void;
}

// Create the context with a default value
export const SessionContext = createContext<SessionContextType>({
  sessionData: null,
  isLoading: true,
  error: null,
  lastHeartbeat: null,
  sessionState: {
    isSessionStarted: false,
    isSessionFinished: false,
    elapsedSeconds: 0,
    finalDuration: null
  },
  rtConnected: false,
  isHost: () => false,
  formatTime: () => '',
  resetSession: () => {},
  startSession: async () => {},
  handleFinishSession: async () => {},
  updatePlayerReportedStatus: () => {},
  refreshSession: () => {},
  subscribe: () => () => {},
  isConnected: () => false,
  sendMessage: () => false,
  registerVisibilityHandler: () => {},
  unregisterVisibilityHandler: () => {}
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
  const { userData } = useAuth();
  
  // Use our custom hook for session state management
  const {
    sessionData,
    isLoading,
    error,
    sessionState,
    isHost,
    formatTime,
    startSession,
    finishSession: handleFinishSession,
    resetSession,
    refreshSession: rawRefreshSession
  } = useSessionState(sessionId);
  
  // Initialize real-time updates connection
  const useWs = realtimeConfig.useWebSockets;
  
  // Use WebSockets or SSE based on configuration
  const wsConnection = useWebSocketUpdates(useWs ? sessionId : null);
  const sseConnection = useRealTimeUpdates(!useWs ? sessionId : null);
  
  // Use the appropriate connection based on configuration
  const { subscribe, isConnected, disconnect, reconnectWithFreshToken } = 
    useWs ? wsConnection : sseConnection;
  
  // Track last heartbeat
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  
  // Track real-time connection status
  const [rtConnected, setRtConnected] = useState<boolean>(false);
  
  // Create a ref to store visibility change handlers
  const visibilityHandlersRef = useRef<Record<string, () => void>>({});
  
  // Register visibility handler
  const registerVisibilityHandler = useCallback((id: string, handler: () => void) => {
    console.log(`Registering visibility handler ${id}`);
    visibilityHandlersRef.current[id] = handler;
  }, []);
  
  // Unregister visibility handler
  const unregisterVisibilityHandler = useCallback((id: string) => {
    console.log(`Unregistering visibility handler ${id}`);
    delete visibilityHandlersRef.current[id];
  }, []);
  
  // Wrap refreshSession to void the return value
  const refreshSession = useCallback(() => {
    void rawRefreshSession();
  }, [rawRefreshSession]);
  
  // Update player reported status - we ignore the parameters since we just refresh
  const updatePlayerReportedStatus = useCallback(() => {
    refreshSession();
  }, [refreshSession]);
  
  // Set up event subscriptions
  useEffect(() => {
    if (!sessionId) return;
    
    // Handle player kicked events
    const unsubscribePlayerKicked = subscribe('player_kicked', (data) => {
      if (!data || typeof data !== 'object') return;
      
      // Type assertion for TypeScript
      const kickData = data as Record<string, unknown>;
      
      // Only handle the kick event for the current user
      const kickedPlayerId = String(kickData.player_id || '');
      if (userData?.id && kickedPlayerId === userData.id) {
        // Create kick notification
        const hostUsername = String(kickData.host_username || 'Host');
        
        // Set session storage flag to show notification on redirect
        sessionStorage.setItem('playerKicked', 'true');
        sessionStorage.setItem('kickedByHost', hostUsername);
        sessionStorage.setItem('kickedSessionId', sessionId);
        sessionStorage.setItem('kickTimestamp', String(Date.now()));
        
        // Navigate to sessions page
        router.push('/sessions');
      }
    });
    
    // Handle player join event
    const unsubscribePlayerJoin = subscribe('join', (data) => {
      if (!data || typeof data !== 'object') return;
      
      console.log('Received player join event:', data);
      
      // Immediately refresh session data from server
      refreshSession();
    });
    
    // Handle player leave event
    const unsubscribePlayerLeave = subscribe('leave', (data) => {
      if (!data || typeof data !== 'object') return;
      
      console.log('Received player leave event:', data);
      
      // Immediately refresh session data from server
      refreshSession();
    });
    
    // Handle session started event
    const unsubscribeSessionStarted = subscribe('session_started', (data) => {
      if (!data || typeof data !== 'object') return;
      
      console.log('Received session started event:', data);
      
      // Immediately refresh session data from server
      refreshSession();
    });
    
    // Handle session completed event
    const unsubscribeSessionCompleted = subscribe('session_completed', (data) => {
      if (!data || typeof data !== 'object') return;
      
      console.log('Received session completed event:', data);
      
      // Immediately refresh session data from server
      refreshSession();
    });
    
    // Handle results submitted event
    const unsubscribeResultSubmitted = subscribe('result_submitted', (data) => {
      if (!data || typeof data !== 'object') return;
      
      console.log('Received result submitted event:', data);
      
      // Immediately refresh session data from server
      refreshSession();
    });
    
    // Handle session cancel event
    const unsubscribeCancel = subscribe('cancel', (data) => {
      if (!data || typeof data !== 'object') return;
      
      // Get cancelled session ID
      const cancelledSessionId = typeof data === 'object' && data !== null && 'sessionId' in data 
                ? String(data.sessionId) : null;
      
      if (cancelledSessionId === sessionId) {
        // For non-hosts, set cancellation info in storage and redirect
        if (!isHost()) {
          // Store in sessionStorage to be picked up by components
          const sessionName = sessionData?.name || `Session #${sessionId}`;
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
    
    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setRtConnected(isConnected());
    }, 5000);
    
    // Handle heartbeat events
    const heartbeatEventName = useWs ? 'ws-heartbeat' : 'sse-heartbeat';
    
    const handleHeartbeat = (event: Event) => {
      const customEvent = event as CustomEvent;
      setLastHeartbeat(customEvent.detail.timestamp);
    };
    
    window.addEventListener(heartbeatEventName, handleHeartbeat);
    
    return () => {
      unsubscribePlayerKicked();
      unsubscribePlayerJoin();
      unsubscribePlayerLeave();
      unsubscribeSessionStarted();
      unsubscribeSessionCompleted();
      unsubscribeResultSubmitted();
      unsubscribeCancel();
      clearInterval(statusInterval);
      window.removeEventListener(heartbeatEventName, handleHeartbeat);
      disconnect();
    };
  }, [sessionId, subscribe, isConnected, disconnect, isHost, router, userData?.id, sessionData?.name, useWs, refreshSession]);
  
  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visibility changed to visible, calling handlers');
        
        // Call all registered visibility handlers
        Object.entries(visibilityHandlersRef.current).forEach(([id, handler]) => {
          try {
            console.log(`Calling visibility handler: ${id}`);
            handler();
          } catch (e) {
            console.error(`Error in visibility handler ${id}:`, e);
          }
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
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
  const contextValue = useMemo(() => {
    // Process session data to update hasReported flags based on results array
    let processedSessionData = sessionData;
    
    if (processedSessionData && processedSessionData.results && processedSessionData.results.length > 0) {
      // Create a set of user IDs who have submitted results for quick lookup
      const reportedUserIds = new Set(processedSessionData.results.map(result => result.userId));
      
      // Create a deep copy of the session data to avoid mutating the original
      processedSessionData = {
        ...processedSessionData,
        joinedPlayers: processedSessionData.joinedPlayers.map(player => ({
          ...player,
          // Set hasReported to true if the user ID is in the results array
          hasReported: reportedUserIds.has(player.userId) || player.hasReported === true
        }))
      };
    }

    return {
      sessionData: processedSessionData || null,
      isLoading,
      error: error ? String(error) : null,
      lastHeartbeat,
      sessionState,
      rtConnected,
      isHost,
      formatTime,
      resetSession,
      startSession,
      handleFinishSession,
      updatePlayerReportedStatus,
      refreshSession,
      subscribe,
      isConnected,
      sendMessage: wsConnection.sendMessage,
      registerVisibilityHandler,
      unregisterVisibilityHandler
    };
  }, [
    sessionData,
    isLoading,
    error,
    lastHeartbeat,
    sessionState,
    rtConnected,
    isHost,
    formatTime,
    resetSession,
    startSession,
    handleFinishSession,
    updatePlayerReportedStatus,
    refreshSession,
    subscribe,
    isConnected,
    wsConnection.sendMessage,
    registerVisibilityHandler,
    unregisterVisibilityHandler
  ]);
  
  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
} 