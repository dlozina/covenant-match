import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { FriendButton } from './FriendButton';
import { usePlayerStatus } from './usePlayerStatus';
import { SessionState } from '@/components/session/SessionReducers';
import { SessionData } from '@/components/session/common/types';

interface PlayerSectionProps {
  sessionState: SessionState;
  friendState: {
    [playerId: string]: boolean;
  };
  addFriend: (playerId: string) => void;
  sessionData?: SessionData;
  currentUserId?: string;
}

interface PlayerRowProps {
  player: SessionData['joinedPlayers'][0];
  index: number;
  isHost: boolean;
  isCurrentUser: boolean;
  sessionState: SessionState;
  friendState: {
    [playerId: string]: boolean;
  };
  addFriend: (playerId: string) => void;
}

const PlayerRowComponent = ({ 
  player, 
  index, 
  isHost, 
  isCurrentUser, 
  sessionState, 
  friendState, 
  addFriend
}: PlayerRowProps) => {
  const playerStatus = usePlayerStatus(isHost, sessionState, player.hasReported);
  
  return (
    <div className="flex items-center space-x-4">
      <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary">
        <span>P{index + 1}</span>
      </Avatar>
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
        <div className="bg-secondary/50 px-3 py-2 rounded-md">
          <span className="text-foreground">{player.username}</span>
        </div>
        <div className="bg-secondary/50 px-3 py-2 rounded-md">
          <span className="text-foreground">{player.nightfarer}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {isHost && (
            <Badge variant="outline" className="bg-blue-950/30 text-blue-500 border-blue-500">
              Host
            </Badge>
          )}
          {/* Show friend button only if session is finished and this is not the current user */}
          {sessionState.isSessionFinished && !isCurrentUser && (
            <FriendButton 
              playerId={player.userId} 
              isFriend={friendState[player.userId]} 
              onAddFriend={addFriend} 
            />
          )}
          <Badge 
            variant="outline" 
            className={playerStatus.color}
          >
            {playerStatus.text}
          </Badge>
        </div>
      </div>
    </div>
  );
};

PlayerRowComponent.displayName = 'PlayerRow';
const PlayerRow = memo(PlayerRowComponent);

interface EmptyPlayerSlotProps {
  position: number;
}

const EmptyPlayerSlotComponent = ({ position }: EmptyPlayerSlotProps) => (
  <div className="flex items-center space-x-4">
    <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary/50">
      <span>P{position}</span>
    </Avatar>
    <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
      <div className="bg-secondary/30 px-3 py-2 rounded-md">
        <span className="text-muted-foreground">Empty Slot</span>
      </div>
      <div className="bg-secondary/30 px-3 py-2 rounded-md">
        <span className="text-muted-foreground">Not Joined</span>
      </div>
      <Badge 
        variant="outline" 
        className="bg-secondary/50 text-muted-foreground border-muted-foreground ml-auto"
      >
        Waiting
      </Badge>
    </div>
  </div>
);

EmptyPlayerSlotComponent.displayName = 'EmptyPlayerSlot';
const EmptyPlayerSlot = memo(EmptyPlayerSlotComponent);

const PlayerSectionComponent = ({ 
  sessionState, 
  friendState, 
  addFriend, 
  sessionData,
  currentUserId
}: PlayerSectionProps) => {
  // Function to check if a player is the host
  const isPlayerHost = (playerId: string): boolean => {
    return Boolean(sessionData && sessionData.hostId === playerId);
  };

  // Function to check if a player is the current user
  const isCurrentUser = (playerId: string): boolean => {
    return Boolean(currentUserId && playerId === currentUserId);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render actual players */}
        {sessionData && sessionData.joinedPlayers.map((player, index) => (
          <React.Fragment key={player.userId}>
            <PlayerRow 
              player={player}
              index={index}
              isHost={isPlayerHost(player.userId)}
              isCurrentUser={isCurrentUser(player.userId)}
              sessionState={sessionState}
              friendState={friendState}
              addFriend={addFriend}
            />
            {/* Add divider after each player except the last one */}
            {index < sessionData.joinedPlayers.length - 1 && (
              <div className="border-t border-border"></div>
            )}
          </React.Fragment>
        ))}

        {/* If no session data, show default player */}
        {(!sessionData || sessionData.joinedPlayers.length === 0) && (
          <div className="flex items-start sm:items-center space-x-4">
            <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary mt-1 sm:mt-0">
              <span>P1</span>
            </Avatar>
            <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
              <div className="bg-secondary/50 px-3 py-2 rounded-md">
                <span className="text-foreground">DarkKnight88</span>
              </div>
              <div className="bg-secondary/50 px-3 py-2 rounded-md">
                <span className="text-foreground">Shadow Lord</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Badge variant="outline" className="bg-blue-950/30 text-blue-500 border-blue-500">
                  Host
                </Badge>
                <Badge variant="outline" className="bg-amber-950/30 text-amber-500 border-amber-500">
                  Ready
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Add divider before empty slots if we have any real players */}
        {(!sessionData || sessionData.joinedPlayers.length < 3) && sessionData && sessionData.joinedPlayers.length > 0 && (
          <div className="border-t border-border"></div>
        )}

        {/* Empty player slots to maintain layout */}
        {(!sessionData || sessionData.joinedPlayers.length < 3) && (
          <div className="space-y-4 opacity-50">
            {/* If we have 0 or 1 players, show the second empty slot */}
            {(!sessionData || sessionData.joinedPlayers.length <= 1) && (
              <React.Fragment>
                <EmptyPlayerSlot position={2} />
                {/* Add divider between empty slots */}
                <div className="border-t border-border"></div>
              </React.Fragment>
            )}
            
            {/* If we have 0, 1, or 2 players, show the third empty slot */}
            {(!sessionData || sessionData.joinedPlayers.length <= 2) && (
              <EmptyPlayerSlot position={3} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

PlayerSectionComponent.displayName = 'PlayerSection';

export const PlayerSection = memo(PlayerSectionComponent); 