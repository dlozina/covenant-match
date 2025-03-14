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
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionFinished');
    localStorage.removeItem('finalDuration');
    localStorage.removeItem('sessionId');
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