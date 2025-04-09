export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface GameSession {
  id: string;
  hostId: string;
  password?: string;
  character: string;
  status: 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled';
  joinedPlayers: {
    userId: string;
    username: string;
    character: string;
    joined_at: string;
  }[];
  createdAt: string;
  updatedAt: string;
  statsUpdated?: boolean;
}

export interface GameResult {
  sessionId: string;
  userId: string;
  result: 'win' | 'loss' | 'disconnect';
  character: string;
  submittedAt: string;
}

export interface PlayerStatistics {
  userId: string;
  username: string;
  totalGames: number;
  wins: number;
  losses: number;
  disconnects: number;
  winRate: number;
  characterStats: {
    [character: string]: {
      played: number;
      wins: number;
      winRate: number;
    };
  };
}
