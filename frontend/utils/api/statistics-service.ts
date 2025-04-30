import { httpClient } from "./http-client";
import { UserStats } from "./types";

interface StatisticsResponse {
  status: string;
  data: UserStats[];
  notFoundUsers: string[] | null;
}

export class StatisticsService {
  static async getBatchStatistics(userIds: string[]): Promise<StatisticsResponse> {
    // Join userIds with commas to create a single parameter
    const userIdsParam = userIds.join(',');
    
    return httpClient.get<StatisticsResponse>(`/api/v1/statistics/batch?userIds=${userIdsParam}`, true);
  }
} 