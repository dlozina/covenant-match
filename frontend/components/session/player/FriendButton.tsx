import React, { memo, useState } from 'react';
import { UserService } from '@/utils/api/user-service';

interface FriendButtonProps {
  playerId: string;
  isFriend: boolean;
  onAddFriend: (playerId: string) => void;
}

const FriendButtonComponent = ({ playerId, isFriend, onAddFriend }: FriendButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddFriend = async () => {
    if (isFriend || isLoading) return;
    
    setIsLoading(true);
    try {
      await UserService.addFriend(playerId);
      console.log('Friend added successfully');
      onAddFriend(playerId);
    } catch (error) {
      console.error('Error adding friend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleAddFriend}
      disabled={isFriend || isLoading}
      className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
        isLoading
          ? 'bg-secondary/50 text-muted-foreground cursor-wait'
          : isFriend 
            ? 'bg-emerald-500 text-white cursor-default' 
            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
      }`}
      title={isFriend ? "Friend Added" : isLoading ? "Adding..." : "Add Friend"}
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
};

FriendButtonComponent.displayName = 'FriendButton';

export const FriendButton = memo(FriendButtonComponent); 