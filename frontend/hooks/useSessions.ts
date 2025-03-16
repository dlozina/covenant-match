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
