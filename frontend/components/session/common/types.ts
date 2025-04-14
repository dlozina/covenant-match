// Define common types for session components
export interface JoinedPlayer {
  userId: string;
  username: string;
  nightfarer: string;
  covenantName?: string;
  joinedAt: string;
  hasReported?: boolean;
}

export interface SessionData {
  id: string;
  name: string;
  hostId: string;
  status: string;
  nightLord: string;
  joinedPlayers: JoinedPlayer[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  password: string | null;
  _version?: number;
} 