// Interface for stored session data
interface StoredSession {
  sessionId: string | null;
  startTime: string | null;
  isFinished: boolean;
  finalDuration: string | null;
}

// Local storage utility functions
export const storageUtils = {
  saveSessionStart: (startTime: number, sessionId: string): void => {
    localStorage.setItem('sessionStartTime', startTime.toString());
    localStorage.setItem('sessionId', sessionId);
    localStorage.removeItem('sessionFinished');
  },
  
  saveSessionFinish: (duration: number): void => {
    localStorage.setItem('sessionFinished', 'true');
    localStorage.setItem('finalDuration', duration.toString());
  },
  
  clearSessionData: (): void => {
    // Extract sessionId before removing it
    const sessionId = localStorage.getItem('sessionId');
    
    // Clear session metadata
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionFinished');
    localStorage.removeItem('finalDuration');
    localStorage.removeItem('sessionId');
    
    // Remove generic timer data
    localStorage.removeItem('startTime');
    localStorage.removeItem('elapsed');
    localStorage.removeItem('lastSync');
    localStorage.removeItem('isRunning');
    
    // Remove session-specific timer data
    if (sessionId) {
      localStorage.removeItem(`session-timer-${sessionId}-startTime`);
      localStorage.removeItem(`session-timer-${sessionId}-elapsed`);
      localStorage.removeItem(`session-timer-${sessionId}-lastSync`);
      localStorage.removeItem(`session-timer-${sessionId}-isRunning`);
    }
    
    // Also clear the current session ID reference
    localStorage.removeItem('session-timer-currentSessionId');
    
    // Clean any other potential session-specific timer data
    cleanupAllSessionTimerData();
    
    // Do another removal of session-specific timer data after a small delay
    // This helps clear any cookies that might get recreated by components after the initial cleanup
    setTimeout(() => {
      cleanupAllSessionTimerData();
      
      // For the specifically problematic cookies, try one more time
      if (sessionId) {
        localStorage.removeItem(`session-timer-${sessionId}-lastSync`);
        localStorage.removeItem(`session-timer-${sessionId}-isRunning`);
      }
    }, 300);
  },
  
  getStoredSession: (): StoredSession => {
    return {
      sessionId: localStorage.getItem('sessionId'),
      startTime: localStorage.getItem('sessionStartTime'),
      isFinished: localStorage.getItem('sessionFinished') === 'true',
      finalDuration: localStorage.getItem('finalDuration')
    };
  }
};

// Helper function to cleanup all session timer data by scanning localStorage
function cleanupAllSessionTimerData(): void {
  const timerPrefix = 'session-timer-';
  
  try {
    // Get all localStorage keys and make a copy of them
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    
    // Now process the copied keys
    allKeys.forEach(key => {
      if (key && key.startsWith(timerPrefix)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Error cleaning up session timer data:', e);
  }
}