import React from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { storageUtils } from '@/components/session/SessionUtils';
import { SessionState } from '@/components/session/SessionReducers';
import { SessionData } from '@/components/session/common/types';
import { useSessionControls } from './useSessionControls';

interface SessionControlButtonsProps {
  sessionState: SessionState;
  startSession: () => void;
  resetSession: () => void;
  showConfirmDialog: () => void;
  onRecreateSession?: () => void;
  isNewSessionLoading?: boolean;
  disabled?: boolean;
  sessionData?: SessionData;
  isHost?: boolean;
  currentSessionId?: string;
}

export const SessionControlButtons: React.FC<SessionControlButtonsProps> = ({ 
  sessionState, 
  startSession, 
  resetSession, 
  showConfirmDialog, 
  onRecreateSession,
  isNewSessionLoading = false,
  disabled = false,
  sessionData,
  isHost = false,
  currentSessionId
}) => {
  // Use our custom hook to get all button states and logic
  const {
    hasEnoughPlayers,
    startButtonDisabled,
    finishButtonDisabled,
    recreateButtonDisabled,
    startButtonTooltip,
    finishButtonTooltip,
    recreateButtonTooltip,
    newSessionAvailable,
    shouldHighlightButton,
  } = useSessionControls({
    sessionState,
    sessionData,
    isHost,
    currentSessionId,
    isNewSessionLoading,
    disabled,
    onRecreateSession
  });
  
  return (
    <Card className="mt-6">
      <CardContent className="py-6">
        {sessionState.isSessionFinished ? (
          <div className="space-y-4">
            {/* Primary action button */}
            <div className="flex">
              <Button 
                size="lg" 
                className={`flex-1 h-14 text-lg ${shouldHighlightButton ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse' : ''}`}
                onClick={isHost ? onRecreateSession : (onRecreateSession || resetSession)}
                disabled={recreateButtonDisabled}
                title={recreateButtonTooltip}
              >
                {isNewSessionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                    {isHost ? "Creating New Session..." : "Joining New Session..."}
                  </span>
                ) : (
                  <>
                    <span className="sm:hidden flex flex-col items-center">
                      <span>New Session</span>
                      <span className="text-xs text-muted-foreground">with same team</span>
                    </span>
                    <span className="hidden sm:inline">
                      {shouldHighlightButton ? "➤ Join New Session With Same Team" : "Start New Session With Same Team"}
                    </span>
                  </>
                )}
              </Button>
            </div>
            
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
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => storageUtils.clearSessionData()}
                asChild
                disabled={disabled}
              >
                <Link href="/sessions/create">Create New Session</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex flex-col">
                <Button 
                  size="lg" 
                  className="h-14 text-lg w-full"
                  onClick={startSession}
                  disabled={startButtonDisabled}
                  title={startButtonTooltip}
                >
                  {sessionState.isSessionStarted ? 'Session Started' : 'Start Session'}
                </Button>
                {!hasEnoughPlayers && !sessionState.isSessionStarted && sessionData && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    3 players required ({sessionData.joinedPlayers.length}/3 joined)
                  </p>
                )}
                {!isHost && !sessionState.isSessionStarted && (
                  <p className="text-xs text-amber-500 mt-1 text-center">
                    Only the host can start the session
                  </p>
                )}
              </div>
              <Button 
                size="lg" 
                variant="destructive" 
                className="flex-1 h-14 text-lg"
                onClick={showConfirmDialog}
                disabled={finishButtonDisabled}
                title={finishButtonTooltip}
              >
                Finish Session
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 