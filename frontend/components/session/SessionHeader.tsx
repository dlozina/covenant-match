import { useSessionContext } from './context/SessionContext';
import { Badge } from '@/components/ui/badge';
import { HeartIcon } from 'lucide-react';
import { useCallback } from 'react';

interface SessionHeaderProps {
  title?: string;
}

export function SessionHeader({ title }: SessionHeaderProps) {
  const { sessionData, rtConnected, lastHeartbeat } = useSessionContext();
  
  const formatLastHeartbeat = useCallback(() => {
    if (!lastHeartbeat) return 'No heartbeat received';
    
    const now = Date.now();
    const diff = now - lastHeartbeat;
    
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)} seconds ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    
    return new Date(lastHeartbeat).toLocaleTimeString();
  }, [lastHeartbeat]);
  
  // Get session ID from session data or from title
  const sessionId = sessionData?.id || (title ? title.replace('Session #', '') : 'unknown');
  
  // For the display name, prioritize the actual session name from data, not from title
  // (title is just "Session #123" format which duplicates the ID)
  const displayName = sessionData?.name || 'Loading Session...';
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 bg-secondary/30 p-3 rounded-md">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>ID: {sessionId.substring(0, 8)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3 mt-2 sm:mt-0">
        <div className="flex items-center gap-1">
          <div className={`h-3 w-3 rounded-full ${rtConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs">{rtConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <HeartIcon className="h-4 w-4 text-red-500" />
          <span className="text-xs">{formatLastHeartbeat()}</span>
        </div>
        
        {sessionData && (
          <Badge variant={sessionData.status === 'Completed' ? 'default' : sessionData.status === 'InProgress' ? 'secondary' : 'outline'}>
            {sessionData.status}
          </Badge>
        )}
      </div>
    </div>
  );
} 