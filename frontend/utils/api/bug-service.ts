import { httpClient } from './http-client';

export interface BugReport {
  id: string;
  title: string;
  device: string;
  description: string;
  user_id: string;
  user_name: string;
  created_at: string | { $date: { $numberLong: string } };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedBugsResponse {
  status: string;
  data: {
    bugs: BugReport[];
    pagination: PaginationInfo;
  };
}

export interface BugReportResponse {
  status: string;
  data: {
    bug: BugReport;
  };
}

// Safely format MongoDB date objects
export const formatDate = (dateObj: string | { $date: { $numberLong: string } } | undefined): string => {
  try {
    if (!dateObj) return 'Unknown date';
    
    if (typeof dateObj === 'object' && dateObj.$date && dateObj.$date.$numberLong) {
      const timestamp = parseInt(dateObj.$date.$numberLong);
      if (!isNaN(timestamp)) {
        const date = new Date(timestamp);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          return "Invalid date";
        }
        return date.toLocaleString();
      }
    }
    
    if (typeof dateObj === 'string') {
      const date = new Date(dateObj);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return date.toLocaleString();
    }
    
    return "Unknown date";
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Unknown date";
  }
};

export class BugService {
  // Get all bug reports with pagination (admin only)
  static async getAllBugReports(page: number = 1, limit: number = 10, search?: string): Promise<PaginatedBugsResponse> {
    try {
      let endpoint = `/api/v1/bugs?page=${page}&limit=${limit}`;
      
      if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }
      
      return await httpClient.get<PaginatedBugsResponse>(endpoint, true);
    } catch (error) {
      console.error('Error fetching bug reports:', error);
      throw error;
    }
  }

  // Get a specific bug report by ID (admin only)
  static async getBugReportById(id: string): Promise<BugReportResponse> {
    try {
      return await httpClient.get<BugReportResponse>(`/api/v1/bugs/${id}`, true);
    } catch (error) {
      console.error(`Error fetching bug report with ID ${id}:`, error);
      throw error;
    }
  }
} 