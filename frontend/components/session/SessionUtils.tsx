// Interface for stored session data
interface StoredSession {
  sessionId: string | null;
  isFinished: boolean;
}

// Local storage utility functions
export const storageUtils = {
  saveSessionStart: (sessionId: string): void => {
    localStorage.setItem('sessionId', sessionId);
    localStorage.removeItem('sessionFinished');
  },
  
  saveSessionFinish: (): void => {
    localStorage.setItem('sessionFinished', 'true');
  },
  
  clearSessionData: (): void => {
    // Clear session metadata
    localStorage.removeItem('sessionFinished');
    localStorage.removeItem('sessionId');
  },
  
  getStoredSession: (): StoredSession => {
    return {
      sessionId: localStorage.getItem('sessionId'),
      isFinished: localStorage.getItem('sessionFinished') === 'true'
    };
  }
};