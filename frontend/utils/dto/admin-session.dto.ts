// DTOs for admin session data
// These interfaces match the backend data structure in camelCase

// Session status type
export type SessionStatus = "Open" | "Full" | "InProgress" | "Completed" | "Cancelled";

// Player data in a session
export interface AdminPlayerDto {
  userId: string;
  username: string;
  nightfarer: string;
  covenantName: string;
  region: string;
  platform: string;
  joinedAt: string;
}

// Result data in a session
export interface AdminResultDto {
  userId: string;
  result: "Win" | "Loss" | "Disconnect";
  rating: number;
  feedback: string;
  submittedAt: string;
}

// Rating data in a session
export interface AdminRatingDto {
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// MongoDB ObjectId format
export interface ObjectIdDto {
  $oid: string;
}

// Date format from MongoDB
export interface MongoDateDto {
  $date: {
    $numberLong: string;
  };
}

// Raw session data from API - updated to camelCase to match our backend changes
export interface AdminSessionDto {
  id: string;
  name: string;
  hostId: string;
  region: string;
  platform: string;
  password: string;
  isPrivate: boolean;
  nightLord: string;
  status: SessionStatus;
  joinedPlayers: AdminPlayerDto[];
  results: AdminResultDto[];
  ratings: AdminRatingDto[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  statsUpdated: boolean;
  newSessionCreated: boolean;
  newSessionCreatedId: string | null;
}

// Pagination data
export interface AdminPaginationDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API response structure
export interface AdminSessionsResponseDto {
  status: string;
  data: {
    sessions: AdminSessionDto[];
    pagination: AdminPaginationDto;
  };
}

// Single session response
export interface AdminSessionResponseDto {
  status: string;
  data: AdminSessionDto;
} 