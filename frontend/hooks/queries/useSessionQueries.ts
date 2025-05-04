import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SessionData } from '@/components/session/common/types';
import { useAuth } from '@/lib/auth-context';

// Query key factory
const sessionKeys = {
  all: ['sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (filters: string) => [...sessionKeys.lists(), { filters }] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
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