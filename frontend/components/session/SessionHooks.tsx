import { useEffect } from 'react';

type OnTickCallback = (elapsed: number) => void;

// Custom hook for timer management
export function useSessionTimer(
  isActive: boolean, 
  onTick: OnTickCallback, 
  startTimeRef: React.RefObject<number | null>
): void {
  useEffect(() => {
    if (!isActive) return;
    
    // Make sure we have a valid start time
    if (!startTimeRef.current) {
      return;
    }
    
    // Use setInterval for more consistent timing
    const intervalId = setInterval(() => {
      const now = Date.now();
      const startTime = startTimeRef.current;
      
      // Safety check
      if (!startTime) {
        console.error('startTimeRef became null during timer execution');
        return;
      }
      
      const elapsed = Math.floor((now - startTime) / 1000);
      onTick(elapsed);
    }, 1000); // Update every second
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isActive, onTick, startTimeRef]);
}