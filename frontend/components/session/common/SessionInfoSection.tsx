import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SessionState } from '@/components/session/SessionReducers';
import { SessionData } from './types';
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Function to generate session join URL
export const getSessionJoinUrl = (sessionId: string): string => {
  return `${window.location.origin}/sessions/join?id=${sessionId}`;
};

interface SessionInfoSectionProps {
  sessionState: SessionState;
  sessionData?: SessionData;
}

// Simplified session info component
const SessionInfoSection: React.FC<SessionInfoSectionProps> = ({ 
  sessionState, 
  sessionData
}) => {
  const [showCopied, setShowCopied] = useState(false);

  // Function to handle copying the session link to clipboard
  const handleCopyLink = () => {
    if (sessionData?.id) {
      const url = getSessionJoinUrl(sessionData.id);
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

        {sessionData?.id && !sessionState.isSessionStarted && (
          <>
            {/* Add a divider for visual separation */}
            <div className="border-t border-border"></div>
          </>
        )}

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

        {/* Add a divider for visual separation */}
        <div className="border-t border-border"></div>

        <p className="text-sm text-muted-foreground mt-auto">
          {!sessionState.isSessionStarted 
            ? 'Waiting for the host to start the session.'
            : (
                <>
                  Once the host ends the session, players can report results.
                  <br />
                  When everyone&apos;s done, the host can launch a new session with the same team.
                </>
              )
          }
        </p>

      </CardContent>
    </Card>
  );
};

SessionInfoSection.displayName = 'SessionInfoSection';

export { SessionInfoSection }; 