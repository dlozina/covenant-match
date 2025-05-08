import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SessionState } from '@/components/session/SessionReducers';
import { SessionData } from './types';
import { formatDistanceToNow } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SessionInfoSectionProps {
  sessionState: SessionState;
  sessionData?: SessionData;
  lastHeartbeat?: number | null;
}

// Simplified session info component without complex timer logic
const SessionInfoSection: React.FC<SessionInfoSectionProps> = ({ 
  sessionState, 
  sessionData
}) => {
  const [showCopied, setShowCopied] = useState(false);

  // Function to handle copying the session link to clipboard
  const handleCopyLink = () => {
    if (sessionData?.id) {
      const url = `${window.location.origin}/sessions/join?id=${sessionData.id}`;
      navigator.clipboard.writeText(url)
        .then(() => {
          setShowCopied(true);
          setTimeout(() => {
            setShowCopied(false);
          }, 2000);
        })
        .catch(err => {
          console.error('Error copying to clipboard:', err);
        });
    }
  };

  // Memoize the relative time display to prevent unnecessary rerenders
  const relativeTime = useMemo(() => {
    // If session hasn't started yet according to state
    if (!sessionState.isSessionStarted) {
      return 'Not started yet';
    }
    
    // If session is finished, just show completed
    if (sessionState.isSessionFinished) {
      return 'Session completed';
    }
    
    // If no session data or startedAt is null/undefined
    if (!sessionData?.startedAt) {
      return 'Session in progress';
    }
    
    try {
      // For proper date handling, ensure we're working with a string
      const startTimeStr = typeof sessionData.startedAt === 'string' 
        ? sessionData.startedAt 
        : String(sessionData.startedAt);
      
      // Create a date object
      const startTime = new Date(startTimeStr);
      
      // Verify the date is valid
      if (isNaN(startTime.getTime())) {
        return 'Session in progress';
      }
      
      // Format the relative time
      return `Started ${formatDistanceToNow(startTime, { addSuffix: true })}`;
    } catch (e) {
      // Log error in development but not in production to avoid console noise
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error formatting date:', e);
      }
      // Fallback if anything goes wrong
      return 'Session in progress';
    }
  }, [sessionState.isSessionStarted, sessionState.isSessionFinished, sessionData?.startedAt]);

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
            Status:
          </span>
          <span 
            className={`font-medium ${sessionState.isSessionStarted && !sessionState.isSessionFinished ? 'text-emerald-500 font-bold' : 'text-foreground'}`}
            data-testid="session-timer"
          >
            {relativeTime}
          </span>
        </div>

        {/* Share session link button - only show when session is in "open" state */}
        {sessionData?.id && !sessionState.isSessionStarted && (
          <div className="flex justify-center mt-2">
            <TooltipProvider>
              <Tooltip open={showCopied}>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleCopyLink} 
                    variant="default" 
                    size="sm" 
                    className="w-full order-1 sm:order-2 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                  >
                    <Share2 size={16} />
                    Share Session Link
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Link copied to clipboard!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

SessionInfoSection.displayName = 'SessionInfoSection';

export { SessionInfoSection }; 