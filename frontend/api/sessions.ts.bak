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
    console.log(`[DEBUG API] Joining session ${sessionId} with user data:`, userData);
    
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}/sessions/${sessionId}/join`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userData.userId,
        nightfarer: userData.character
      }),
    });
    
    if (!response.ok) {
      console.error(`[DEBUG API] Error joining session: ${response.status} ${response.statusText}`);
      const errorData = await response.json().catch(() => ({}));
      console.error('[DEBUG API] Error details:', errorData);
      throw new Error(`Error joining session: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[DEBUG API] Successfully joined session:', data);
    return data;
  } catch (error) {
    console.error("[DEBUG API] Failed to join session:", error);
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