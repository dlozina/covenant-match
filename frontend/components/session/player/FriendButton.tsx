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
  
  // Get friendship status from matrix
  const relationship = friendshipMatrix?.[currentUserId]?.[playerId];
  const isFriend = relationship?.isFriend ?? false;
  const isPendingRequest = relationship?.isPendingRequest ?? false;
  
  // Log friend status for debugging
  useEffect(() => {
    console.log(`Friend status for ${playerId}: ${isFriend ? 'Friend' : isPendingRequest ? 'Request Pending' : 'Not Friend'}`);
  }, [isFriend, isPendingRequest, playerId]);

  const handleAddFriend = async () => {
    // Don't do anything if already a friend, has pending request, or in loading state
    if (isFriend || isPendingRequest || isLoading) return;
    
    setIsLoading(true);
    try {
      await UserService.sendFriendRequest(playerId);
      console.log('Friend request sent successfully');
      
      // Invalidate friendship matrix query to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['sessions', 'friendships', sessionId]
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine button state
  const isActive = isFriend || isPendingRequest;

  // Determine button text/title
  let buttonTitle = "Add Friend";
  if (isLoading) {
    buttonTitle = "Adding...";
  } else if (isFriend) {
    buttonTitle = "Friend Added";
  } else if (isPendingRequest) {
    buttonTitle = "Friend Request Sent";
  }

  // Determine status for data attribute
  let friendStatus = "not-friend";
  if (isFriend) {
    friendStatus = "friend";
  } else if (isPendingRequest) {
    friendStatus = "pending";
  }

  return (
    <button 
      onClick={handleAddFriend}
      disabled={isActive || isLoading || isMatrixLoading}
      className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors ${
        isMatrixLoading
          ? 'bg-secondary/30 text-muted-foreground cursor-wait'
          : isLoading
            ? 'bg-secondary/50 text-muted-foreground cursor-wait'
            : isActive
              ? 'bg-emerald-500 text-white cursor-default' 
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
      }`}
      title={buttonTitle}
      data-friend-status={friendStatus}
    >
      {isActive ? (
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