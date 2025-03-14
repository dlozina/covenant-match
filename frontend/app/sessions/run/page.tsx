'use client'
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useCallback, useMemo, useReducer } from "react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Mock session ID - in a real app, this would come from the URL or props
const SESSION_ID = "28571";

// Define types for our state and actions
interface SessionState {
  isSessionStarted: boolean;
  isSessionFinished: boolean;
  elapsedSeconds: number;
  finalDuration: number | null;
}

type SessionAction = 
  | { type: 'START_SESSION' }
  | { type: 'UPDATE_ELAPSED'; payload: number }
  | { type: 'FINISH_SESSION' }
  | { type: 'RESTORE_SESSION'; payload: Partial<SessionState> }
  | { type: 'RESET_SESSION' };

interface FriendState {
  [playerId: string]: boolean;
}

type FriendAction = { type: 'ADD_FRIEND'; payload: string };

interface DialogState {
  showConfirmDialog: boolean;
  showWarningDialog: boolean;
}

type DialogAction = 
  | { type: 'SHOW_CONFIRM' }
  | { type: 'HIDE_CONFIRM' }
  | { type: 'SHOW_WARNING' }
  | { type: 'HIDE_WARNING' };

interface ResultState {
  selectedResult: string;
  rating: number;
}

type ResultAction = 
  | { type: 'SELECT_RESULT'; payload: string }
  | { type: 'SET_RATING'; payload: number };

// Session reducer
const initialSessionState: SessionState = {
  isSessionStarted: false,
  isSessionFinished: false,
  elapsedSeconds: 0,
  finalDuration: null,
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        isSessionStarted: true,
        isSessionFinished: false,
        finalDuration: null
      };
    case 'UPDATE_ELAPSED':
      return {
        ...state,
        elapsedSeconds: action.payload
      };
    case 'FINISH_SESSION':
      return {
        ...state,
        isSessionFinished: true,
        finalDuration: state.elapsedSeconds
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        ...action.payload
      };
    case 'RESET_SESSION':
      return initialSessionState;
    default:
      return state;
  }
}

// Friend status reducer
function friendStatusReducer(state: FriendState, action: FriendAction): FriendState {
  switch (action.type) {
    case 'ADD_FRIEND':
      return {
        ...state,
        [action.payload]: true
      };
    default:
      return state;
  }
}

// Dialog state reducer
function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'SHOW_CONFIRM':
      return {
        ...state,
        showConfirmDialog: true
      };
    case 'HIDE_CONFIRM':
      return {
        ...state,
        showConfirmDialog: false
      };
    case 'SHOW_WARNING':
      return {
        ...state,
        showWarningDialog: true
      };
    case 'HIDE_WARNING':
      return {
        ...state,
        showWarningDialog: false
      };
    default:
      return state;
  }
}

// Result selection reducer
function resultReducer(state: ResultState, action: ResultAction): ResultState {
  switch (action.type) {
    case 'SELECT_RESULT':
      return {
        ...state,
        selectedResult: action.payload
      };
    case 'SET_RATING':
      return {
        ...state,
        rating: action.payload
      };
    default:
      return state;
  }
}

// Local storage utility functions
const storageUtils = {
  saveSessionStart: (startTime: number): void => {
    localStorage.setItem('sessionStartTime', startTime.toString());
    localStorage.setItem('sessionId', SESSION_ID);
    localStorage.removeItem('sessionFinished');
  },
  
  saveSessionFinish: (duration: number): void => {
    localStorage.setItem('sessionFinished', 'true');
    localStorage.setItem('finalDuration', duration.toString());
  },
  
  clearSessionData: (): void => {
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionFinished');
    localStorage.removeItem('finalDuration');
    localStorage.removeItem('sessionId');
  },
  
  getStoredSession: () => {
    return {
      sessionId: localStorage.getItem('sessionId'),
      startTime: localStorage.getItem('sessionStartTime'),
      isFinished: localStorage.getItem('sessionFinished') === 'true',
      finalDuration: localStorage.getItem('finalDuration')
    };
  }
};

// Custom hook for timer management
function useSessionTimer(
  isActive: boolean, 
  onTick: (elapsed: number) => void, 
  startTimeRef: React.RefObject<number | null>
): void {
  useEffect(() => {
    if (!isActive) return;
    
    let animationFrameId: number;
    
    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - (startTimeRef.current || now)) / 1000);
      
      onTick(elapsed);
      animationFrameId = requestAnimationFrame(tick);
    };
    
    animationFrameId = requestAnimationFrame(tick);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, onTick, startTimeRef]);
}

export default function SessionResultsPage() {
  // Use reducers for related state groups
  const [sessionState, dispatchSession] = useReducer(sessionReducer, initialSessionState);
  const [friendState, dispatchFriend] = useReducer(friendStatusReducer, {
    'player2': false,
    'player3': false
  });
  const [dialogState, dispatchDialog] = useReducer(dialogReducer, {
    showConfirmDialog: false,
    showWarningDialog: false
  });
  const [resultState, dispatchResult] = useReducer(resultReducer, {
    selectedResult: 'win',
    rating: 5
  });
  
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
    }, []),
    sessionStartTimeRef
  );
  
  // Sync with server (memoized)
  const syncWithServer = useCallback(() => {
    // TODO: Implement server sync
    // This would be an API call to get the current session time from your backend
    // Example:
    // fetch(`/api/sessions/${SESSION_ID}/elapsed`)
    //   .then(response => response.json())
    //   .then(data => {
    //     // Update elapsed time from server
    //     dispatchSession({ type: 'UPDATE_ELAPSED', payload: data.elapsedSeconds });
    //     // Adjust start time to maintain consistency
    //     sessionStartTimeRef.current = Date.now() - (data.elapsedSeconds * 1000);
    //   });
  }, []);
  
  // Start session (memoized)
  const startSession = useCallback(() => {
    if (sessionState.isSessionStarted) return;
    
    // Set session as started
    dispatchSession({ type: 'START_SESSION' });
    
    // Record start time
    const startTime = Date.now();
    sessionStartTimeRef.current = startTime;
    lastSyncTimeRef.current = startTime;
    
    // Store in localStorage for persistence
    storageUtils.saveSessionStart(startTime);
    
    // TODO: Send API request to start session on server
    // This would be an API call to your backend
    // Example: 
    // fetch('/api/sessions/start', {
    //   method: 'POST',
    //   body: JSON.stringify({ sessionId: SESSION_ID })
    // })
    // .then(response => response.json())
    // .then(data => {
    //   // Update with server timestamp if needed
    //   sessionStartTimeRef.current = data.startTimestamp;
    // });
  }, [sessionState.isSessionStarted]);
  
  // Handle finish session (memoized)
  const handleFinishSession = useCallback(() => {
    // Store the final duration and update state
    dispatchSession({ type: 'FINISH_SESSION' });
    dispatchDialog({ type: 'HIDE_CONFIRM' });
    
    // Mark session as finished in localStorage
    storageUtils.saveSessionFinish(sessionState.elapsedSeconds);
    
    // TODO: Send API request to end session on server
    // Example:
    // fetch('/api/sessions/end', {
    //   method: 'POST',
    //   body: JSON.stringify({ 
    //     sessionId: SESSION_ID,
    //     duration: sessionState.elapsedSeconds
    //   })
    // });
  }, [sessionState.elapsedSeconds]);
  
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
    const { sessionId, startTime, isFinished, finalDuration } = storageUtils.getStoredSession();
    
    // If the session ID doesn't match, reset everything
    if (sessionId && sessionId !== SESSION_ID) {
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
  }, [resetSession, syncWithServer]);
  
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
  
  // Memoize UI sections for better performance
  const PlayerSection = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Player 1 (You) */}
        <div className="flex items-start sm:items-center space-x-4">
          <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary mt-1 sm:mt-0">
            <span>You</span>
          </Avatar>
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
            <div className="bg-secondary/50 px-3 py-2 rounded-md">
              <span className="text-foreground">DarkKnight88</span>
            </div>
            <div className="bg-secondary/50 px-3 py-2 rounded-md">
              <span className="text-foreground">Shadow Lord</span>
            </div>
            <Badge variant="outline" className="text-emerald-500 border-emerald-500 ml-auto">
              Reported
            </Badge>
          </div>
        </div>

        {/* Player 2 */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary">
            <span>P2</span>
          </Avatar>
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
            <div className="bg-secondary/50 px-3 py-2 rounded-md">
              <span className="text-foreground">FrostQueen</span>
            </div>
            <div className="bg-secondary/50 px-3 py-2 rounded-md">
              <span className="text-foreground">Ice Maiden</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {sessionState.isSessionFinished && (
                <button 
                  onClick={() => addFriend('player2')}
                  disabled={friendState.player2}
                  className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
                    friendState.player2 
                      ? 'bg-emerald-500 text-white cursor-default' 
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                  title={friendState.player2 ? "Friend Added" : "Add Friend"}
                >
                  {friendState.player2 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <polyline points="16 11 18 13 22 9"></polyline>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <line x1="19" y1="8" x2="19" y2="14"></line>
                      <line x1="16" y1="11" x2="22" y2="11"></line>
                    </svg>
                  )}
                </button>
              )}
              <Badge variant="outline" className="text-emerald-500 border-emerald-500">
                Reported
              </Badge>
            </div>
          </div>
        </div>

        {/* Player 3 */}
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary">
            <span>P3</span>
          </Avatar>
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
            <div className="bg-secondary/50 px-3 py-2 rounded-md">
              <span className="text-foreground">FlameWarrior</span>
            </div>
            <div className="bg-secondary/50 px-3 py-2 rounded-md">
              <span className="text-foreground">Fire Knight</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {sessionState.isSessionFinished && (
                <button 
                  onClick={() => addFriend('player3')}
                  disabled={friendState.player3}
                  className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
                    friendState.player3 
                      ? 'bg-emerald-500 text-white cursor-default' 
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                  title={friendState.player3 ? "Friend Added" : "Add Friend"}
                >
                  {friendState.player3 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <polyline points="16 11 18 13 22 9"></polyline>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <line x1="19" y1="8" x2="19" y2="14"></line>
                      <line x1="16" y1="11" x2="22" y2="11"></line>
                    </svg>
                  )}
                </button>
              )}
              <Badge variant="outline" className="text-muted-foreground border-muted-foreground">
                Pending
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  ), [sessionState.isSessionFinished, friendState, addFriend]);

  // Session control buttons
  const SessionControlButtons = useMemo(() => (
    <Card className="mt-6">
      <CardContent className="py-6">
        {sessionState.isSessionFinished ? (
          <div className="space-y-4">
            {/* Primary action button */}
            <div className="flex">
              <Button 
                size="lg" 
                className="flex-1 h-14 text-lg"
                onClick={resetSession}
              >
                <span className="sm:hidden flex flex-col items-center">
                  <span>New Session</span>
                  <span className="text-xs text-muted-foreground">with same team</span>
                </span>
                <span className="hidden sm:inline">Start New Session With Same Team</span>
              </Button>
            </div>
            
            {/* Navigation buttons - only shown after session is finished */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => storageUtils.clearSessionData()}
                asChild
              >
                <Link href="/sessions">Back to Sessions</Link>
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => storageUtils.clearSessionData()}
                asChild
              >
                <Link href="/sessions/create">Create New Session</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="flex-1 h-14 text-lg"
              onClick={startSession}
              disabled={sessionState.isSessionStarted}
            >
              {sessionState.isSessionStarted ? 'Session Started' : 'Start Session'}
            </Button>
            <Button 
              size="lg" 
              variant="destructive" 
              className="flex-1 h-14 text-lg"
              onClick={() => dispatchDialog({ type: 'SHOW_CONFIRM' })}
              disabled={!sessionState.isSessionStarted || sessionState.isSessionFinished}
            >
              Finish Session
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  ), [
    sessionState.isSessionFinished, 
    sessionState.isSessionStarted, 
    resetSession, 
    startSession
  ]);
  
  // Memoized rating stars
  const RatingStars = useMemo(() => (
    <div>
      <p className="text-muted-foreground mb-2">Rate Experience:</p>
      <div className="flex justify-between sm:justify-start sm:space-x-2">
        {[1, 2, 3, 4, 5].map((star) => {
          // Determine color based on rating value
          let colorClass = '';
          if (star <= resultState.rating) {
            if (resultState.rating === 1) {
              colorClass = 'bg-red-500 text-white';
            } else if (resultState.rating <= 3) {
              colorClass = 'bg-amber-500 text-white';
            } else {
              colorClass = 'bg-emerald-500 text-white';
            }
          } else {
            colorClass = 'bg-secondary text-muted-foreground';
          }
          
          return (
            <button 
              key={star} 
              className={`w-12 h-12 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${colorClass}`}
              onClick={() => dispatchResult({ type: 'SET_RATING', payload: star })}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  ), [resultState.rating]);

  // Memoized session info section
  const SessionInfoSection = useMemo(() => (
    <Card className="flex flex-col flex-grow">
      <CardHeader>
        <CardTitle>Session Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Night Lord:</span>
          <span className="text-foreground">Tricephalos</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Created By:</span>
          <span className="text-foreground">DarkKnight88</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Status:</span>
          <Badge 
            variant="outline" 
            className={`${sessionState.isSessionStarted 
              ? "bg-amber-950/30 text-amber-500 border-amber-500" 
              : "bg-secondary/50 text-muted-foreground border-muted-foreground"}`}
          >
            {sessionState.isSessionStarted ? 'In Progress' : 'Not Started'}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            Session Duration:
          </span>
          <span className="text-foreground font-medium">
            {sessionState.isSessionStarted 
              ? formatTime(sessionState.elapsedSeconds)
              : '0m 00s'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-auto">
          {!sessionState.isSessionStarted 
            ? 'Click "Start Session" to begin the game timer.'
            : 'Click "Finish Session" when you\'re ready to report your results.'}
        </p>
      </CardContent>
    </Card>
  ), [
    sessionState.isSessionStarted, 
    sessionState.elapsedSeconds, 
    formatTime
  ]);

  // Memoized result reporting section  
  const ResultReportingSection = useMemo(() => (
    <Card className="flex flex-col flex-grow">
      <CardHeader>
        <CardTitle>Report Your Result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex-grow flex flex-col justify-between">
        {/* Result Options */}
        <div className="grid grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            className={`h-20 lg:h-24 ${
              resultState.selectedResult === 'win' 
                ? 'bg-emerald-950 text-emerald-500 border-emerald-500 border-2' 
                : 'bg-secondary/50 text-foreground'
            } flex flex-col`}
            onClick={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'win' })}
          >
            <span>WIN</span>
            {resultState.selectedResult === 'win' && (
              <span className="text-xs text-muted-foreground">Selected</span>
            )}
          </Button>
          <Button 
            variant="outline" 
            className={`h-20 lg:h-24 ${
              resultState.selectedResult === 'loss' 
                ? 'bg-emerald-950 text-emerald-500 border-emerald-500 border-2' 
                : 'bg-secondary/50 text-foreground'
            } flex flex-col`}
            onClick={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'loss' })}
          >
            <span>LOSS</span>
            {resultState.selectedResult === 'loss' && (
              <span className="text-xs text-muted-foreground">Selected</span>
            )}
          </Button>
          <Button 
            variant="outline" 
            className={`h-20 lg:h-24 ${
              resultState.selectedResult === 'dc' 
                ? 'bg-emerald-950 text-emerald-500 border-emerald-500 border-2' 
                : 'bg-secondary/50 text-foreground'
            } flex flex-col`}
            onClick={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'dc' })}
            title="Disconnect"
          >
            <span>D/C</span>
            {resultState.selectedResult === 'dc' && (
              <span className="text-xs text-muted-foreground">Selected</span>
            )}
          </Button>
        </div>

        {/* Session Timer */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Session Duration:</span>
          <span className="text-foreground font-medium">
            {formatTime(sessionState.finalDuration || sessionState.elapsedSeconds)}
          </span>
        </div>

        {/* Rating Stars */}
        {RatingStars}

        {/* Submit Button */}
        <Button className="w-full h-12 mt-auto">Submit Results</Button>
      </CardContent>
    </Card>
  ), [
    resultState.selectedResult,
    sessionState.finalDuration,
    sessionState.elapsedSeconds,
    formatTime,
    RatingStars
  ]);

  const Dialogs = useMemo(() => (
    <>
      {/* Finish Session Confirmation Dialog */}
      <AlertDialog 
        open={dialogState.showConfirmDialog} 
        onOpenChange={(open) => {
          if (!open) dispatchDialog({ type: 'HIDE_CONFIRM' });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finish this session? You will be asked to report your results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishSession}>
              Yes, Finish Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Warning Dialog about session state */}
      <AlertDialog 
        open={dialogState.showWarningDialog} 
        onOpenChange={(open) => {
          if (!open) dispatchDialog({ type: 'HIDE_WARNING' });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session State Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Please note that if you navigate away from this page or refresh the browser, your session state will be lost. 
              It&apos;s recommended to complete your session before leaving this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>I Understand</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  ), [dialogState.showConfirmDialog, dialogState.showWarningDialog, handleFinishSession]);

  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-10 mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl font-bold">Nightreign Session Results</h1>
          <span className="text-muted-foreground">Session ID: {SESSION_ID}</span>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Players Section */}
            {PlayerSection}

            {/* Session Control Buttons */}
            {SessionControlButtons}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 flex flex-col h-full">
            {/* Report Your Result Section - Only shown after session is finished */}
            {sessionState.isSessionFinished ? (
              ResultReportingSection
            ) : (
              SessionInfoSection
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {Dialogs}
    </MainLayout>
  );
}