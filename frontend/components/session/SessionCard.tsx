import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameSession } from "@/types";
import { timeAgo } from "@/lib/utils";

interface SessionCardProps {
  session: GameSession;
  onJoin: (sessionId: string) => void;
}

export function SessionCard({ session, onJoin }: SessionCardProps) {
  const playerCount = session.joinedPlayers.length;
  const maxPlayers = 3;
  const isJoinable = playerCount < maxPlayers && session.status === 'open';
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Session by {session.joinedPlayers[0]?.username || "Unknown"}</CardTitle>
        <CardDescription>
          Created {timeAgo(session.createdAt)} • {playerCount}/{maxPlayers} players
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Host Character:</span>
            <span className="text-sm">{session.character}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <span className="text-sm capitalize">{session.status.replace('_', ' ')}</span>
          </div>
          {session.joinedPlayers.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Players:</h4>
              <div className="space-y-1">
                {session.joinedPlayers.map((player) => (
                  <div key={player.userId} className="text-sm flex justify-between">
                    <span>{player.username}</span>
                    <span>{player.character}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onJoin(session.id)} 
          disabled={!isJoinable}
          className="w-full"
        >
          {isJoinable ? "Join Session" : session.status === 'full' ? "Session Full" : "Session Unavailable"}
        </Button>
      </CardFooter>
    </Card>
  );
}
