import React, { memo, useState, useEffect } from 'react';
import { UserService } from '@/utils/api/user-service';
import { useFriendshipMatrix } from '@/hooks/queries/useSessionQueries';
import { useQueryClient } from '@tanstack/react-query';

interface FriendButtonProps {
  playerId: string;
  sessionId: string;
  currentUserId: string;
}

const FriendButtonComponent = ({ playerId, sessionId, currentUserId }: FriendButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  
  // Get friendship data from query
  const { data: friendshipMatrix, isLoading: isMatrixLoading } = useFriendshipMatrix(sessionId);
  
  // Determine if the player is a friend based on the matrix
  const isFriend = Boolean(friendshipMatrix?.[currentUserId]?.[playerId]);
  
  // Log friend status for debugging
  useEffect(() => {
    console.log(`Friend status for ${playerId}: ${isFriend ? 'Friend' : 'Not Friend'}`);
    console.log('Current matrix state:', friendshipMatrix);
  }, [isFriend, playerId, friendshipMatrix]);

  const handleAddFriend = async () => {
    if (isFriend || isLoading) return;
    
    setIsLoading(true);
    try {
      await UserService.addFriend(playerId);
      console.log('Friend added successfully, invalidating queries');
      
      // Invalidate friendship matrix query to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['sessions', 'friendships', sessionId]
      });
    } catch (error) {
      console.error('Error adding friend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleAddFriend}
      disabled={isFriend || isLoading || isMatrixLoading}
      className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
        isMatrixLoading
          ? 'bg-secondary/30 text-muted-foreground cursor-wait'
          : isLoading
            ? 'bg-secondary/50 text-muted-foreground cursor-wait'
            : isFriend 
              ? 'bg-emerald-500 text-white cursor-default' 
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
      }`}
      title={isFriend ? "Friend Added" : isLoading ? "Adding..." : "Add Friend"}
      data-friend-status={isFriend ? "friend" : "not-friend"}
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