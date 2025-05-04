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
  results?: SessionResult[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  password: string | null;
  _version?: number;
  newSessionCreated?: boolean;
  newSessionCreatedId?: string;
}

// Define the SessionResult interface
export interface SessionResult {
  userId: string;
  result: string;
  rating: number;
  feedback?: string;
  submittedAt?: any;
} 