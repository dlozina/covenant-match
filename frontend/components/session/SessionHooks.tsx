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
    
    let animationFrameId: number;
    
    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - (startTimeRef.current || now)) / 1000);
      
      onTick(elapsed);
      animationFrameId = requestAnimationFrame(tick);
    };
    
    animationFrameId = requestAnimationFrame(tick);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, onTick, startTimeRef]);
}