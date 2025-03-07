import { useEffect, useState } from "react";
import { fetchAvailableSessions } from "@/api/sessions";
import { GameSession } from "@/types";

export function useSessions() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadSessions() {
    try {
      setLoading(true);
      const data = await fetchAvailableSessions();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    
    // Set up polling for real-time updates
    const intervalId = setInterval(loadSessions, 10000); // Poll every 10 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  return {
    sessions,
    loading,
    error,
    refresh: loadSessions,
  };
}
