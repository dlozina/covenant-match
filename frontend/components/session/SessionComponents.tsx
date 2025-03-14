import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { storageUtils } from '@/components/session/SessionUtils';
import { SessionState, FriendState, ResultState, ResultAction } from '@/components/session/SessionReducers';

interface PlayerSectionProps {
  sessionState: SessionState;
  friendState: FriendState;
  addFriend: (playerId: string) => void;
}

interface PlayerRowProps {
  avatarText: string;
  username: string;
  characterName: string;
  playerId: string;
  friendState: FriendState;
  addFriend: (playerId: string) => void;
  sessionFinished: boolean;
  badgeText: string;
  badgeVariant: string;
}

interface FriendButtonProps {
  playerId: string;
  isFriend: boolean;
  onAddFriend: (playerId: string) => void;
}

interface SessionControlButtonsProps {
  sessionState: SessionState;
  startSession: () => void;
  resetSession: () => void;
  showConfirmDialog: () => void;
}

interface SessionInfoSectionProps {
  sessionState: SessionState;
  formatTime: (seconds: number) => string;
}

interface RatingStarsProps {
  rating: number;
  onSetRating: (rating: number) => void;
}

interface ResultReportingSectionProps {
  resultState: ResultState;
  dispatchResult: React.Dispatch<ResultAction>;
  sessionState: SessionState;
  formatTime: (seconds: number) => string;
}

interface ResultButtonProps {
  type: string;
  isSelected: boolean;
  onSelect: () => void;
}

interface FinishSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

interface WarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Player section component
export const PlayerSection: React.FC<PlayerSectionProps> = ({ sessionState, friendState, addFriend }) => (
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
      <PlayerRow 
        avatarText="P2" 
        username="FrostQueen" 
        characterName="Ice Maiden"
        playerId="player2"
        friendState={friendState}
        addFriend={addFriend}
        sessionFinished={sessionState.isSessionFinished}
        badgeText="Reported"
        badgeVariant="emerald"
      />

      {/* Player 3 */}
      <PlayerRow 
        avatarText="P3" 
        username="FlameWarrior" 
        characterName="Fire Knight"
        playerId="player3"
        friendState={friendState}
        addFriend={addFriend}
        sessionFinished={sessionState.isSessionFinished}
        badgeText="Pending"
        badgeVariant="muted"
      />
    </CardContent>
  </Card>
);

// Player row component (used within PlayerSection)
const PlayerRow: React.FC<PlayerRowProps> = ({ 
  avatarText, 
  username, 
  characterName, 
  playerId, 
  friendState, 
  addFriend, 
  sessionFinished,
  badgeText,
  badgeVariant
}) => (
  <div className="flex items-center space-x-4">
    <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary">
      <span>{avatarText}</span>
    </Avatar>
    <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
      <div className="bg-secondary/50 px-3 py-2 rounded-md">
        <span className="text-foreground">{username}</span>
      </div>
      <div className="bg-secondary/50 px-3 py-2 rounded-md">
        <span className="text-foreground">{characterName}</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {sessionFinished && (
          <FriendButton 
            playerId={playerId} 
            isFriend={friendState[playerId]} 
            onAddFriend={addFriend} 
          />
        )}
        <Badge 
          variant="outline" 
          className={`text-${badgeVariant}-500 border-${badgeVariant}-500`}
        >
          {badgeText}
        </Badge>
      </div>
    </div>
  </div>
);

// Friend button component (used within PlayerRow)
const FriendButton: React.FC<FriendButtonProps> = ({ playerId, isFriend, onAddFriend }) => (
  <button 
    onClick={() => onAddFriend(playerId)}
    disabled={isFriend}
    className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
      isFriend 
        ? 'bg-emerald-500 text-white cursor-default' 
        : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
    }`}
    title={isFriend ? "Friend Added" : "Add Friend"}
  >
    {isFriend ? (
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
);

// Session control buttons component
export const SessionControlButtons: React.FC<SessionControlButtonsProps> = ({ 
  sessionState, 
  startSession, 
  resetSession, 
  showConfirmDialog 
}) => (
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
            onClick={showConfirmDialog}
            disabled={!sessionState.isSessionStarted || sessionState.isSessionFinished}
          >
            Finish Session
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
);

// Session information section component
export const SessionInfoSection: React.FC<SessionInfoSectionProps> = ({ sessionState, formatTime }) => (
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
);

// Rating stars component (used within ResultReportingSection)
const RatingStars: React.FC<RatingStarsProps> = ({ rating, onSetRating }) => (
  <div>
    <p className="text-muted-foreground mb-2">Rate Experience:</p>
    <div className="flex justify-between sm:justify-start sm:space-x-2">
      {[1, 2, 3, 4, 5].map((star) => {
        // Determine color based on rating value
        let colorClass = '';
        if (star <= rating) {
          if (rating === 1) {
            colorClass = 'bg-red-500 text-white';
          } else if (rating <= 3) {
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
            onClick={() => onSetRating(star)}
          >
            ★
          </button>
        );
      })}
    </div>
  </div>
);

// Result reporting section component
export const ResultReportingSection: React.FC<ResultReportingSectionProps> = ({ 
  resultState, 
  dispatchResult, 
  sessionState, 
  formatTime 
}) => (
  <Card className="flex flex-col flex-grow">
    <CardHeader>
      <CardTitle>Report Your Result</CardTitle>
    </CardHeader>
    <CardContent className="space-y-6 flex-grow flex flex-col justify-between">
      {/* Result Options */}
      <div className="grid grid-cols-3 gap-3">
        <ResultButton 
          type="win" 
          isSelected={resultState.selectedResult === 'win'}
          onSelect={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'win' })}
        />
        <ResultButton 
          type="loss" 
          isSelected={resultState.selectedResult === 'loss'}
          onSelect={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'loss' })}
        />
        <ResultButton 
          type="dc" 
          isSelected={resultState.selectedResult === 'dc'}
          onSelect={() => dispatchResult({ type: 'SELECT_RESULT', payload: 'dc' })}
        />
      </div>

      {/* Session Timer */}
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Session Duration:</span>
        <span className="text-foreground font-medium">
          {formatTime(sessionState.finalDuration || sessionState.elapsedSeconds)}
        </span>
      </div>

      {/* Rating Stars */}
      <RatingStars 
        rating={resultState.rating} 
        onSetRating={(rating) => dispatchResult({ type: 'SET_RATING', payload: rating })}
      />

      {/* Submit Button */}
      <Button className="w-full h-12 mt-auto">Submit Results</Button>
    </CardContent>
  </Card>
);

// Result button component (used within ResultReportingSection)
const ResultButton: React.FC<ResultButtonProps> = ({ type, isSelected, onSelect }) => {
  const label = type === 'dc' ? 'D/C' : type.toUpperCase();
  const title = type === 'dc' ? 'Disconnect' : type;
  
  return (
    <Button 
      variant="outline" 
      className={`h-20 lg:h-24 ${
        isSelected 
          ? 'bg-emerald-950 text-emerald-500 border-emerald-500 border-2' 
          : 'bg-secondary/50 text-foreground'
      } flex flex-col`}
      onClick={onSelect}
      title={title}
    >
      <span>{label}</span>
      {isSelected && (
        <span className="text-xs text-muted-foreground">Selected</span>
      )}
    </Button>
  );
};

// Finish session dialog component
export const FinishSessionDialog: React.FC<FinishSessionDialogProps> = ({ isOpen, onClose, onConfirm }) => (
  <AlertDialog 
    open={isOpen} 
    onOpenChange={(open) => {
      if (!open) onClose();
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
        <AlertDialogAction onClick={onConfirm}>
          Yes, Finish Session
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// Warning dialog component
export const WarningDialog: React.FC<WarningDialogProps> = ({ isOpen, onClose }) => (
  <AlertDialog 
    open={isOpen} 
    onOpenChange={(open) => {
      if (!open) onClose();
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
);