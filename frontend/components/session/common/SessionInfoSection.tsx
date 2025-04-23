import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SessionState } from '@/components/session/SessionReducers';
import { SessionData } from './types';

interface SessionInfoSectionProps {
  sessionState: SessionState;
  formatTime: (seconds: number) => string;
  sessionData?: SessionData;
  lastHeartbeat?: number | null;
}

// Self-contained session timer component - doesn't rely on frequent context updates
const SessionInfoSection: React.FC<SessionInfoSectionProps> = ({ 
  sessionState, 
  formatTime, 
  sessionData,
  lastHeartbeat
}) => {
  // Stand-alone timer state that doesn't trigger parent re-renders
  const [displayTime, setDisplayTime] = useState<string>(
    sessionState.isSessionStarted 
      ? formatTime(sessionState.elapsedSeconds || 0)
      : '0m 00s'
  );

  // Refs to prevent re-renders while maintaining state
  const timerRef = useRef<{
    intervalId: number | null;
    startTimeMs: number | null;
    elapsedSeconds: number;
    isRunning: boolean;
    lastSync: number;
  }>({
    intervalId: null,
    startTimeMs: null,
    elapsedSeconds: sessionState.elapsedSeconds || 0,
    isRunning: sessionState.isSessionStarted && !sessionState.isSessionFinished,
    lastSync: Date.now()
  });

  // Local storage keys
  const STORAGE_PREFIX = 'session-timer';
  const getStorageKey = (key: string) => {
    return `${STORAGE_PREFIX}-${sessionData?.id || 'unknown'}-${key}`;
  };

  // Save timer state to localStorage (doesn't trigger renders)
  const saveTimerState = () => {
    if (!sessionData?.id) return;
    
    try {
      localStorage.setItem(getStorageKey('startTime'), String(timerRef.current.startTimeMs || ''));
      localStorage.setItem(getStorageKey('elapsed'), String(timerRef.current.elapsedSeconds || 0));
      localStorage.setItem(getStorageKey('lastSync'), String(timerRef.current.lastSync));
      localStorage.setItem(getStorageKey('isRunning'), String(timerRef.current.isRunning));
    } catch (e) {
      console.error('Failed to save timer state to localStorage', e);
    }
  };

  // Load timer state from localStorage
  const loadTimerState = (): boolean => {
    if (!sessionData?.id) return false;
    
    try {
      const startTime = localStorage.getItem(getStorageKey('startTime'));
      const elapsed = localStorage.getItem(getStorageKey('elapsed'));
      const lastSync = localStorage.getItem(getStorageKey('lastSync'));
      const isRunning = localStorage.getItem(getStorageKey('isRunning'));
      
      if (startTime && elapsed && lastSync) {
        const startTimeMs = parseInt(startTime, 10);
        const elapsedSeconds = parseInt(elapsed, 10);
        const lastSyncTime = parseInt(lastSync, 10);
        
        // Only use valid numbers
        if (!isNaN(startTimeMs) && !isNaN(elapsedSeconds) && !isNaN(lastSyncTime)) {
          timerRef.current.startTimeMs = startTimeMs || null;
          timerRef.current.elapsedSeconds = elapsedSeconds;
          timerRef.current.lastSync = lastSyncTime;
          timerRef.current.isRunning = isRunning === 'true';
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to load timer state from localStorage', e);
    }
    
    return false;
  };

  // Initialize timer
  const initializeTimer = () => {
    // If the session is already finished, show the final time
    if (sessionState.isSessionFinished) {
      if (sessionState.finalDuration !== null) {
        timerRef.current.elapsedSeconds = sessionState.finalDuration;
        setDisplayTime(formatTime(sessionState.finalDuration));
      }
      timerRef.current.isRunning = false;
      return;
    }
    
    // Reset the timer state
    timerRef.current.isRunning = sessionState.isSessionStarted && !sessionState.isSessionFinished;
    timerRef.current.elapsedSeconds = 0;
    
    // If the session hasn't started yet, just display 00:00:00
    if (!sessionState.isSessionStarted) {
      setDisplayTime(formatTime(0));
      return;
    }
    
    // Use the following priority:
    // 1. Server data (startedAt)
    // 2. Storage data
    // 3. Context data (elapsedSeconds)
    // 4. Default (0)
    
    let initialized = false;
    
    // First, try to initialize from server data
    if (sessionData?.startedAt && sessionState.isSessionStarted) {
      try {
        const serverStartTime = new Date(sessionData.startedAt).getTime();
        if (!isNaN(serverStartTime)) {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - serverStartTime) / 1000);
          
          if (elapsedSeconds >= 0) {
            timerRef.current.startTimeMs = serverStartTime;
            timerRef.current.elapsedSeconds = elapsedSeconds;
            timerRef.current.lastSync = now;
            timerRef.current.isRunning = !sessionState.isSessionFinished;
            initialized = true;
            
            // Also update display immediately
            setDisplayTime(formatTime(elapsedSeconds));
            
            // Save to localStorage
            saveTimerState();
          }
        }
      } catch (e) {
        console.error('Error initializing timer from server data:', e);
      }
    }
    
    // If not initialized from server, try localStorage
    if (!initialized) {
      initialized = loadTimerState();
      
      // Update display if we loaded successfully
      if (initialized) {
        setDisplayTime(formatTime(timerRef.current.elapsedSeconds));
      }
    }
    
    // If still not initialized, use context
    if (!initialized) {
      timerRef.current.elapsedSeconds = sessionState.elapsedSeconds || 0;
      timerRef.current.isRunning = sessionState.isSessionStarted && !sessionState.isSessionFinished;
      timerRef.current.lastSync = Date.now();
      
      // Calculate start time based on elapsed seconds
      if (timerRef.current.isRunning) {
        timerRef.current.startTimeMs = Date.now() - (timerRef.current.elapsedSeconds * 1000);
      } else {
        timerRef.current.startTimeMs = null;
      }
      
      setDisplayTime(formatTime(timerRef.current.elapsedSeconds));
    }
  };

  // Start/stop timer based on session state
  useEffect(() => {
    const isRunning = sessionState.isSessionStarted && !sessionState.isSessionFinished;
    
    // Handle session state changes
    if (isRunning !== timerRef.current.isRunning) {
      timerRef.current.isRunning = isRunning;
      
      // If starting
      if (isRunning) {
        if (!timerRef.current.startTimeMs) {
          // Calculate start time based on elapsed seconds
          timerRef.current.startTimeMs = Date.now() - (timerRef.current.elapsedSeconds * 1000);
        }
      }
      
      // If stopping (session finished)
      if (!isRunning && sessionState.isSessionFinished) {
        if (sessionState.finalDuration !== null && sessionState.finalDuration !== undefined) {
          timerRef.current.elapsedSeconds = sessionState.finalDuration;
          setDisplayTime(formatTime(sessionState.finalDuration));
        } else {
          // If finalDuration is not available, use the current elapsed time
          setDisplayTime(formatTime(timerRef.current.elapsedSeconds));
        }
      }
      
      // Save updated state
      saveTimerState();
    }
    
    // If there's a new session, re-initialize
    if (sessionData?.id) {
      // Only reinitialize if we don't have a start time yet or the session ID changed
      const storedSessionId = localStorage.getItem(`${STORAGE_PREFIX}-currentSessionId`);
      if (!timerRef.current.startTimeMs || storedSessionId !== sessionData.id) {
        localStorage.setItem(`${STORAGE_PREFIX}-currentSessionId`, sessionData.id);
        initializeTimer();
      }
    }
  }, [
    sessionState.isSessionStarted, 
    sessionState.isSessionFinished,
    sessionState.finalDuration, 
    sessionData?.id, 
    sessionData?.startedAt
  ]);

  // Set up the actual timer
  useEffect(() => {
    // Clear any existing interval
    if (timerRef.current.intervalId) {
      clearInterval(timerRef.current.intervalId);
      timerRef.current.intervalId = null;
    }
    
    // Initialize on first render if not already done
    if (timerRef.current.startTimeMs === null && sessionState.isSessionStarted) {
      initializeTimer();
    }
    
    // Separately handle the case where session is finished but timer needs to display final time
    if (sessionState.isSessionFinished && sessionState.finalDuration !== null && sessionState.finalDuration !== undefined) {
      if (timerRef.current.elapsedSeconds !== sessionState.finalDuration) {
        timerRef.current.elapsedSeconds = sessionState.finalDuration;
        setDisplayTime(formatTime(sessionState.finalDuration));
        timerRef.current.isRunning = false;
      }
    }
    
    // Only run timer if session is active
    if (!timerRef.current.isRunning) return;
    
    // Create timer update function
    const updateTimer = () => {
      // Only update if the timer is still running
      if (!timerRef.current.isRunning) return;
      
      // Only process if we have a valid start time
      if (timerRef.current.startTimeMs) {
        const now = Date.now();
        const newElapsed = Math.floor((now - timerRef.current.startTimeMs) / 1000);
        
        // Only update if we have a valid elapsed time
        if (!isNaN(newElapsed) && newElapsed >= 0) {
          timerRef.current.elapsedSeconds = newElapsed;
          setDisplayTime(formatTime(newElapsed));
          
          // Periodically save state (every 10 seconds)
          if (now - timerRef.current.lastSync > 10000) {
            timerRef.current.lastSync = now;
            saveTimerState();
          }
        }
      }
    };
    
    // Start interval
    const intervalId = window.setInterval(updateTimer, 1000);
    timerRef.current.intervalId = intervalId;
    
    // Clean up on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [sessionState.isSessionStarted, formatTime, sessionState.isSessionFinished, sessionState.finalDuration]);

  // Handle heartbeats for sync
  useEffect(() => {
    // Only react to heartbeats if we have a session ID and session is running
    if (lastHeartbeat && sessionData?.id && timerRef.current.isRunning) {
      // If session has startedAt, use it to recalculate
      if (sessionData.startedAt) {
        try {
          const serverStartTime = new Date(sessionData.startedAt).getTime();
          if (!isNaN(serverStartTime)) {
            // Only update start time if we don't have one or if there's significant drift
            const now = Date.now();
            const serverElapsed = Math.floor((now - serverStartTime) / 1000);
            const localElapsed = timerRef.current.elapsedSeconds;
            
            // If drift is more than 3 seconds, resync
            if (Math.abs(serverElapsed - localElapsed) > 3) {
              // Only log when significant drift occurs
              console.log('Syncing timer with heartbeat - drift:', Math.abs(serverElapsed - localElapsed), 'seconds');
              
              timerRef.current.startTimeMs = serverStartTime;
              timerRef.current.elapsedSeconds = serverElapsed;
              timerRef.current.lastSync = now;
              
              // Update display
              setDisplayTime(formatTime(serverElapsed));
              
              // Save to localStorage
              saveTimerState();
            }
          }
        } catch (e) {
          console.error('Error processing heartbeat for timer sync:', e);
        }
      }
    }
  }, [lastHeartbeat, sessionData, sessionData?.id, sessionData?.startedAt, formatTime, saveTimerState]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerRef.current.isRunning) {
        // When returning to tab, sync with localStorage and recalculate
        loadTimerState();
        
        // Recalculate based on start time
        if (timerRef.current.startTimeMs) {
          const now = Date.now();
          const elapsed = Math.floor((now - timerRef.current.startTimeMs) / 1000);
          
          if (!isNaN(elapsed) && elapsed >= 0) {
            timerRef.current.elapsedSeconds = elapsed;
            setDisplayTime(formatTime(elapsed));
          }
        }
        
        // Also try to sync with server data
        if (sessionData?.startedAt) {
          try {
            const serverStartTime = new Date(sessionData.startedAt).getTime();
            if (!isNaN(serverStartTime)) {
              // Sync with server time
              const now = Date.now();
              const serverElapsed = Math.floor((now - serverStartTime) / 1000);
              
              // Use server time as source of truth when returning to tab
              timerRef.current.startTimeMs = serverStartTime;
              timerRef.current.elapsedSeconds = serverElapsed;
              timerRef.current.lastSync = now;
              
              // Update display
              setDisplayTime(formatTime(serverElapsed));
              
              // Save to localStorage
              saveTimerState();
            }
          } catch (e) {
            console.error('Error syncing with server data on visibility change:', e);
          }
        }
      }
    };
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [formatTime, sessionData, sessionData?.startedAt, loadTimerState, saveTimerState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      const currentIntervalId = timerRef.current.intervalId;
      if (currentIntervalId) {
        clearInterval(currentIntervalId);
        timerRef.current.intervalId = null;
      }
    };
  }, []);

  return (
    <Card className="flex flex-col flex-grow">
      <CardHeader>
        <CardTitle>Session Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        {/* Make password more prominent */}
        <div className="border border-primary/20 bg-primary/5 p-3 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">In-Game Password:</span>
            <span className="text-foreground font-bold text-lg">{sessionData?.password || 'No Password'}</span>
          </div>
        </div>

        {/* Add a divider for visual separation */}
        <div className="border-t border-border"></div>

        <p className="text-sm text-muted-foreground mt-auto">
          {!sessionState.isSessionStarted 
            ? 'Waiting for the host to start the session.'
            : 'After the host ends the session, each player can report their result.'}
        </p>
        
        {/* Add a divider for visual separation */}
        <div className="border-t border-border"></div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Night Lord:</span>
          <span className="text-foreground">{sessionData ? sessionData.nightLord : 'Tricephalos'}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Created By:</span>
          <span className="text-foreground">
            {sessionData && sessionData.joinedPlayers.length > 0 
              ? sessionData.joinedPlayers[0].username 
              : 'DarkKnight'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            Session Duration:
          </span>
          <span 
            className={`font-medium ${sessionState.isSessionStarted && !sessionState.isSessionFinished ? 'text-emerald-500 font-bold' : 'text-foreground'}`}
            data-testid="session-timer"
          >
            {displayTime}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

SessionInfoSection.displayName = 'SessionInfoSection';

export { SessionInfoSection }; 