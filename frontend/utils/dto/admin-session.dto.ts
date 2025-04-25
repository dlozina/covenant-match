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
  joinedAt: {
    $date: {
      $numberLong: string;
    }
  };
}

// Result data in a session
export interface AdminResultDto {
  userId: string;
  result: "Win" | "Loss" | "Disconnect";
  rating: number;
  feedback: string;
  submittedAt: {
    $date: {
      $numberLong: string;
    }
  };
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

// Raw session data from API
export interface AdminSessionDto {
  _id: ObjectIdDto;
  name: string;
  host_id: string;
  region: string;
  platform: string;
  password: string;
  is_private: boolean;
  night_lord: string;
  status: SessionStatus;
  joined_players: AdminPlayerDto[];
  results: AdminResultDto[];
  ratings: any[];
  created_at: MongoDateDto;
  updated_at: MongoDateDto;
  started_at: MongoDateDto | null;
  completed_at: MongoDateDto | null;
  stats_updated: boolean;
  new_session_created: boolean;
  new_session_created_id: ObjectIdDto | null;
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