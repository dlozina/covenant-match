import { GameSession, GameResult } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function fetchAvailableSessions(): Promise<GameSession[]> {
  try {
    const response = await fetch(`${API_URL}/sessions?status=open`);
    
    if (!response.ok) {
      throw new Error(`Error fetching sessions: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    throw error;
  }
}

export async function createSession(sessionData: Omit<GameSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<GameSession> {
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating session: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
}

export async function joinSession(sessionId: string, userData: { userId: string; character: string }): Promise<GameSession> {
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`Error joining session: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to join session:", error);
    throw error;
  }
}

export async function submitResult(sessionId: string, resultData: Omit<GameResult, 'submittedAt'>): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resultData),
    });
    
    if (!response.ok) {
      throw new Error(`Error submitting result: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to submit result:", error);
    throw error;
  }
}

export async function getSessionById(sessionId: string): Promise<GameSession> {
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching session: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch session:", error);
    throw error;
  }
}

export async function startSession(sessionId: string): Promise<GameSession> {
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error starting session: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to start session:", error);
    throw error;
  }
}