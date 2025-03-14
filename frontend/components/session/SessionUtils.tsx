// Get the SESSION_ID from a constant or a configuration file
// This would normally be imported but we're defining it here for simplicity
const SESSION_ID = "28571";

interface StoredSession {
  sessionId: string | null;
  startTime: string | null;
  isFinished: boolean;
  finalDuration: string | null;
}

// Local storage utility functions
export const storageUtils = {
  saveSessionStart: (startTime: number): void => {
    localStorage.setItem('sessionStartTime', startTime.toString());
    localStorage.setItem('sessionId', SESSION_ID);
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