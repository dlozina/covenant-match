import React, { memo } from 'react';

interface FriendButtonProps {
  playerId: string;
  isFriend: boolean;
  onAddFriend: (playerId: string) => void;
}

export const FriendButton: React.FC<FriendButtonProps> = memo(({ playerId, isFriend, onAddFriend }) => (
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
)); 