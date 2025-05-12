import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SessionData } from '@/components/session/common/types';
import { useAuth } from '@/lib/auth-context';

// Type for friendship matrix data
type FriendshipMatrix = {
  [userId: string]: {
    [friendId: string]: {
      isFriend: boolean;
      isPendingRequest: boolean;
    };
  };
};

// Type for API friendship response
type FriendshipResponse = {
  players: {
    id: string;
    username: string;
    isFriendsWith: string[];
    friendRequestSent: string[];
  }[];
};

// Query key factory
const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (filters: string) => [...sessionKeys.lists(), { filters }] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
  friendships: () => [...sessionKeys.all, 'friendships'] as const,
  friendship: (sessionId: string) => [...sessionKeys.friendships(), sessionId] as const,
};

/**
 * Hook to fetch a single session by ID
 */
export function useSessionData(sessionId: string | null) {
  const { fetchWithAuth } = useAuth();
  
  return useQuery({
    queryKey: sessionKeys.detail(sessionId || 'unknown'),
    queryFn: async (): Promise<SessionData> => {
      if (!sessionId) {
        throw new Error('Invalid session ID');
      }
      
      return await fetchWithAuth(`/api/v1/sessions/${sessionId}`);
    },
    enabled: !!sessionId,
    // Remove refetchInterval and rely on WebSocket events for real-time updates
    // refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true, // Refetch when the window regains focus
    refetchOnMount: true, // Refetch when component mounts
    refetchOnReconnect: true, // Refetch when reconnecting after being offline
  });
}

/**
 * Hook to start a session
 */
export function useStartSession() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return await fetchWithAuth(`/api/v1/sessions/${sessionId}/start`, {
        method: 'POST'
      });
    },
    onSuccess: (_, sessionId) => {
      // Invalidate the session query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

/**
 * Hook to finish a session
 */
export function useFinishSession() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ sessionId, duration }: { sessionId: string; duration: number }) => {
      return await fetchWithAuth(`/api/v1/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ duration })
      });
    },
    onSuccess: (_, { sessionId }) => {
      // Invalidate the session query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

/**
 * Hook to cancel a session
 */
export function useCancelSession() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return await fetchWithAuth(`/api/v1/sessions/${sessionId}/cancel`, {
        method: 'POST'
      });
    },
    onSuccess: (_, sessionId) => {
      // Invalidate the session query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

/**
 * Hook to submit session results
 */
export function useSubmitResult() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      userId,
      result,
      rating,
      feedback,
      covenantName 
    }: {
      sessionId: string;
      userId: string;
      result: string;
      rating: number;
      feedback?: string;
      covenantName?: string;
    }) => {
      return await fetchWithAuth(`/api/v1/sessions/${sessionId}/results`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          result,
          rating,
          feedback: feedback || '',
          covenantName: covenantName || ''
        })
      });
    },
    onSuccess: (_, { sessionId }) => {
      // Invalidate the session query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

/**
 * Hook to leave a session
 */
export function useLeaveSession() {
  const { fetchWithAuth } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      return await fetchWithAuth(`/api/v1/sessions/${sessionId}/leave`, {
        method: 'POST'
      });
    },
    onSuccess: (_, sessionId) => {
      // Invalidate the session query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

/**
 * Hook to fetch friendship matrix for session players
 */
export function useFriendshipMatrix(sessionId: string | null) {
  const { fetchWithAuth } = useAuth();
  
  return useQuery({
    queryKey: sessionKeys.friendship(sessionId || 'unknown'),
    queryFn: async (): Promise<FriendshipMatrix> => {
      if (!sessionId) {
        throw new Error('Invalid session ID');
      }
      
      const response: FriendshipResponse = await fetchWithAuth(`/api/v1/sessions/${sessionId}/friendship-matrix`);
      
      // Transform the response into a friendship matrix
      const matrix: FriendshipMatrix = {};
      
      // Initialize the matrix for all players
      response.players.forEach(player => {
        matrix[player.id] = {};
        
        // Initialize all relationships as false
        response.players.forEach(otherPlayer => {
          if (player.id !== otherPlayer.id) {
            matrix[player.id][otherPlayer.id] = { 
              isFriend: false,
              isPendingRequest: false
            };
          }
        });
      });
      
      // Set true for actual friendships
      response.players.forEach(player => {
        // Mark players as friends
        player.isFriendsWith.forEach(friendId => {
          if (matrix[player.id]) {
            matrix[player.id][friendId] = { 
              isFriend: true,
              isPendingRequest: false
            };
          }
        });

        // Mark pending friend requests
        player.friendRequestSent.forEach(friendId => {
          if (matrix[player.id]) {
            matrix[player.id][friendId] = { 
              isFriend: false,
              isPendingRequest: true
            };
          }
        });
      });
      
      console.log('Transformed friendship matrix:', matrix);
      return matrix;
    },
    enabled: !!sessionId,
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
} 