import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SessionState } from '@/components/session/SessionReducers';
import { SessionData } from './types';

interface SessionInfoSectionProps {
  sessionState: SessionState;
  formatTime: (seconds: number) => string;
  sessionData?: SessionData;
}

export const SessionInfoSection: React.FC<SessionInfoSectionProps> = memo(({ 
  sessionState, 
  formatTime, 
  sessionData 
}) => {
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
              : 'DarkKnight88'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            Session Duration:
          </span>
          <span className={`font-medium ${sessionState.isSessionStarted && !sessionState.isSessionFinished ? 'text-emerald-500 font-bold' : 'text-foreground'}`}>
            {sessionState.isSessionStarted 
              ? formatTime(sessionState.elapsedSeconds)
              : '0m 00s'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}); 