import { useEffect, useState } from "react";
import { sessionService } from "@/utils/api/session-service";
import { GameSession } from "@/types";
import { Session } from "@/utils/api/types";

// Function to convert Session to GameSession
function mapSessionToGameSession(session: Session): GameSession {
  return {
    id: session.id,
    hostId: session.hostId,
    hostExperience: session.hostExperience,
    password: session.password,
    character: session.nightLord, // Using nightLord as character
    status: session.status.toLowerCase() as 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled',
    joinedPlayers: session.joinedPlayers.map(player => ({
      userId: player.userId,
      username: player.username,
      character: player.nightfarer,
      joined_at: player.joinedAt,
    })),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    statsUpdated: false,
  };
}

export function useSessions() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadSessions() {
    try {
      setLoading(true);
      const data = await sessionService.fetchAvailableSessions();
      const mappedSessions = data.map(mapSessionToGameSession);
      setSessions(mappedSessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Load sessions once on component mount
    loadSessions();
  }, []);

  return {
    sessions,
    loading,
    error,
    refresh: loadSessions,
  };
}
