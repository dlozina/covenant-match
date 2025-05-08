import React from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { storageUtils } from '@/components/session/SessionUtils';
import { SessionState } from '@/components/session/SessionReducers';
import { SessionData } from '@/components/session/common/types';
import { useAuth } from '@/lib/auth-context';
import { Bell } from "lucide-react";

interface SessionControlButtonsProps {
  sessionState: SessionState;
  startSession?: () => void;
  resetSession: () => void;
  showConfirmDialog?: () => void;
  onRecreateSession?: () => void;
  isNewSessionLoading?: boolean;
  disabled?: boolean;
  sessionData?: SessionData;
  isHost?: boolean;
  currentSessionId?: string;
  resultSubmitted?: boolean;
  onCancelSession?: () => void;
  onLeaveSession?: () => void;
}

export const SessionControlButtons: React.FC<SessionControlButtonsProps> = ({ 
  sessionState, 
  startSession, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resetSession,
  showConfirmDialog, 
  onRecreateSession,
  isNewSessionLoading = false,
  disabled = false,
  sessionData,
  isHost = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentSessionId,
  resultSubmitted = false,
  onCancelSession,
  onLeaveSession
}) => {
  // Get current user ID from auth context
  const { userData } = useAuth();
  const currentUserId = userData?.id;
  
  // Simplified logic for button state
  const hasEnoughPlayers = Boolean(sessionData && sessionData.joinedPlayers.length >= 3);
  
  // Start button is disabled if the session has started, is disabled, not enough players, or not host
  const startButtonDisabled = !startSession || sessionState.isSessionStarted || disabled || !hasEnoughPlayers || !isHost;
  
  // Finish button is disabled if session not started, is finished, disabled, or not host
  const finishButtonDisabled = !showConfirmDialog || !sessionState.isSessionStarted || sessionState.isSessionFinished || disabled || !isHost;
  
  // Check if all players have reported results
  // If host is logged in AND they've submitted a result locally, consider them as reported
  const hostHasReportedLocally = isHost && resultSubmitted;
  
  const haveAllPlayersReported = sessionData?.joinedPlayers.every(player => {
    // If this is the host and they've reported locally, treat them as reported
    if (hostHasReportedLocally && player.userId === currentUserId) {
      return true;
    }
    // Otherwise use the server data
    return player.hasReported === true;
  }) || false;
  
  // NEW SESSION LOGIC - only hosts can create new sessions
  // Non-hosts will be auto-redirected when the host creates a new session
  const canCreateNewSession = isHost && haveAllPlayersReported && sessionState.isSessionFinished && Boolean(onRecreateSession);
  const newSessionButtonDisabled = disabled || isNewSessionLoading || !canCreateNewSession;
  
  return (
    <Card className="mt-6">
      <CardContent className="py-6">
        {sessionState.isSessionFinished ? (
          <div className="space-y-4">
            {/* Primary action button */}
            {isHost && (
              <div className="flex">
                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                  onClick={onRecreateSession}
                  disabled={newSessionButtonDisabled}
                >
                  {isNewSessionLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                      Creating New Session...
                    </span>
                  ) : (
                    <>
                    <span className="hidden sm:inline">Create New Session With Same Team</span>
                    <span className="sm:hidden flex flex-col items-center">
                      <span className="font-medium">New Session</span>
                      <span className="text-xs">with same team</span>
                    </span>
                  </>
                  )}
                </Button>
              </div>
            )}
            
            {/* Participant message when session is finished */}
            {!isHost && (
              <div className="px-4 py-3 bg-purple-900/30 border border-purple-500 rounded-md text-white text-center">
                <p className="text-sm flex items-center justify-center gap-2">
                  <Bell className="text-white" size={28} />
                  Waiting for the host to create a new session. You&apos;ll be redirected automatically or notification link will appear.
                </p>
              </div>
            )}
            
            {/* Navigation buttons - only shown after session is finished */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => storageUtils.clearSessionData()}
                asChild
                disabled={disabled}
              >
                <Link href="/sessions">Back to Sessions</Link>
              </Button>
              {isHost && (
                <Button 
                  variant="outline" 
                  className="flex-1 h-12"
                  onClick={() => storageUtils.clearSessionData()}
                  asChild
                  disabled={disabled}
                >
                  <Link href="/sessions/create">Create New Session</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {startSession && isHost && (
                <div className="flex-1 flex flex-col">
                  <Button 
                    size="lg" 
                    className="h-14 text-lg w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                    onClick={startSession}
                    disabled={startButtonDisabled}
                  >
                    {sessionState.isSessionStarted ? 'Session Started' : 'Start Session'}
                  </Button>
                  {!hasEnoughPlayers && !sessionState.isSessionStarted && sessionData && (
                    <p className="text-xs text-red-500 mt-1 text-center">
                      3 players required ({sessionData.joinedPlayers.length}/3 joined)
                    </p>
                  )}
                </div>
              )}
              
              {showConfirmDialog && isHost && (
                <Button 
                  size="lg" 
                  variant="destructive" 
                  className="flex-1 h-14 text-lg"
                  onClick={showConfirmDialog}
                  disabled={finishButtonDisabled}
                >
                  Finish Session
                </Button>
              )}
              
              {onCancelSession && !sessionState.isSessionStarted && isHost && (
                <Button 
                  size="lg" 
                  variant="destructive" 
                  className="flex-1 h-14 text-lg"
                  onClick={onCancelSession}
                >
                  Cancel Session
                </Button>
              )}
              
              {onLeaveSession && !sessionState.isSessionStarted && !isHost && (
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="flex-1 h-14 text-lg"
                  onClick={onLeaveSession}
                >
                  Leave Session
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 