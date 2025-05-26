"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Sector, Tooltip, TooltipProps } from "recharts";
import { Loader2, ChevronLeft, ChevronRight, Info, UserPlus, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieSectorDataItem } from "recharts/types/polar/Pie";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  PaginatedSessionHistory,
  PaginatedResponse,
  PaginationInfo,
  SessionHistoryEntry,
  SessionDetail,
  SessionDetailResponse,
  NightLord,
  Nightfarer
} from "@/utils/api";
import { formatDistanceToNow } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Notification, NotificationType } from "@/components/ui/notification";
import { UserService } from "@/utils/api/user-service";
import { GameDataService } from "@/utils/api/game-data-service";
import { Footer } from "@/components/layout/Footer";

interface CharacterStats {
  played: number;
  wins: number;
  losses: number;
  disconnects: number;
  win_rate: number;
}

interface UserStats {
  _id: string;
  user_id: string;
  username: string;
  total_games: number;
  wins: number;
  losses: number;
  disconnects: number;
  win_rate: number;
  nightfarer_stats: Record<string, CharacterStats>;
  night_lord_stats: Record<string, CharacterStats>;
  achievements: string[];
  reputation_score: number;
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { userData, fetchWithAuth } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noStatsYet, setNoStatsYet] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(false);
  const [activeNightfarer, setActiveNightfarer] = useState<string | null>(null);
  const [activeNightLord, setActiveNightLord] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 0,
    limit: 10,
    total: 0,
    total_pages: 0
  });
  
  // Session history filters
  const [filteredHistory, setFilteredHistory] = useState<SessionHistoryEntry[]>([]);
  const [nightLordFilter, setNightLordFilter] = useState<string>('all');
  const [nightfarerFilter, setNightfarerFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  
  // Character data for select dropdowns
  const [nightLords, setNightLords] = useState<NightLord[]>([]);
  const [nightfarers, setNightfarers] = useState<Nightfarer[]>([]);
  const [isLoadingCharacterData, setIsLoadingCharacterData] = useState(false);
  
  // Session details dialog state
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  
  // Friend status tracking
  const [friendStatus, setFriendStatus] = useState<{
    friends: string[],
    pendingRequests: string[],
    loading: Record<string, boolean>
  }>({
    friends: [],
    pendingRequests: [],
    loading: {}
  });
  
  // Notification state
  const [notification, setNotification] = useState<NotificationType | null>(null);

  // Function to fetch session history with filters
  const fetchSessionHistory = async (page: number = 1, filters?: {
    nightLord?: string;
    nightfarer?: string;
    result?: string;
  }) => {
    try {
      setIsLoadingHistory(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', pagination.limit.toString());
      
      // Add filter parameters if they're not 'all'
      if (filters) {
        if (filters.nightLord && filters.nightLord !== 'all') {
          queryParams.append('night_lord', filters.nightLord);
        }
        if (filters.nightfarer && filters.nightfarer !== 'all') {
          queryParams.append('nightfarer', filters.nightfarer);
        }
        if (filters.result && filters.result !== 'all') {
          queryParams.append('result', filters.result);
        }
      }
      
      const response = await fetchWithAuth<PaginatedResponse<PaginatedSessionHistory>>(
        `/api/v1/statistics/users/me/sessions?${queryParams.toString()}`
      );
      
      // Convert from 1-indexed to 0-indexed
      if (response.data && response.data.pagination) {
        response.data.pagination.page -= 1;
      }
      
      setSessionHistory(response.data.sessions);
      setFilteredHistory(response.data.sessions);
      setPagination(response.data.pagination);
      
      // Fetch consensus results for completed sessions
      //fetchConsensusResults(response.data.sessions);
    } catch (err) {
      console.error('Error fetching session history:', err);
      setHistoryError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setNoStatsYet(false);
        const data = await fetchWithAuth<UserStats>('/api/v1/statistics/users/me');
        setStats(data);
        
        // Set initial active characters
        if (data) {
          // Set first nightfarer character as active
          const firstNightfarer = Object.keys(data.nightfarer_stats || {})[0];
          if (firstNightfarer) {
            setActiveNightfarer(firstNightfarer);
          }
          
          // Set first night lord character as active
          const firstNightLord = Object.keys(data.night_lord_stats || {})[0];
          if (firstNightLord) {
            setActiveNightLord(firstNightLord);
          }
        }
      } catch (err) {
        console.error('Error fetching user statistics:', err);
        // Check if error is 404 (not found) which indicates no stats yet
        if (err instanceof Error && err.message.includes('404')) {
          setNoStatsYet(true);
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        setIsLoading(false);
        // Add a slight delay before starting animation
        setTimeout(() => setAnimateCharts(true), 300);
      }
    };
    
    // Fetch character data for select dropdowns
    const fetchCharacterData = async () => {
      try {
        setIsLoadingCharacterData(true);
        const [lords, farers] = await Promise.all([
          GameDataService.getNightLords(),
          GameDataService.getNightfarers()
        ]);
        setNightLords(lords);
        setNightfarers(farers);
      } catch (error) {
        console.error('Error fetching character data:', error);
      } finally {
        setIsLoadingCharacterData(false);
      }
    };

    fetchStats();
    fetchSessionHistory(1);
    fetchCharacterData();
  }, [fetchWithAuth]);
  
  // Effect to fetch session history whenever filters change
  useEffect(() => {
    // Skip on component mount as the initial fetch is already done in the first useEffect
    if (isLoadingHistory) return;
    
    fetchSessionHistory(1, {
      nightLord: nightLordFilter,
      nightfarer: nightfarerFilter,
      result: resultFilter
    });
    
    // Don't include isLoadingHistory in dependencies to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightLordFilter, nightfarerFilter, resultFilter]);
  
  // Function to handle page change
  const handlePageChange = async (newPage: number) => {
    if (newPage < 0 || newPage >= pagination.total_pages) {
      return;
    }
    
    try {
      setIsLoadingHistory(true);
      
      // Pass current filter values when changing pages
      fetchSessionHistory(newPage + 1, {
        nightLord: nightLordFilter,
        nightfarer: nightfarerFilter,
        result: resultFilter
      });
    } catch (err) {
      console.error('Error fetching session history page:', err);
      setHistoryError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setNightLordFilter('all');
    setNightfarerFilter('all');
    setResultFilter('all');
  };

  // Sort character data by number of games played (descending)
  const nightfarerData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.nightfarer_stats || {})
      .map(([character, data]) => ({
        name: character, // Use 'name' for tooltip display
        character,
        played: data.played,
        wins: data.wins,
        losses: data.losses,
        disconnects: data.disconnects,
        win_rate: data.win_rate,
      }))
      .sort((a, b) => b.played - a.played); // Sort by played count
  }, [stats]);

  const nightLordData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.night_lord_stats || {})
      .map(([character, data]) => ({
        name: character, // Use 'name' for tooltip display
        character,
        played: data.played,
        wins: data.wins,
        losses: data.losses,
        disconnects: data.disconnects,
        win_rate: data.win_rate,
      }))
      .sort((a, b) => b.played - a.played); // Sort by played count
  }, [stats]);

  // Calculate active indexes
  const activeNightfarerIndex = useMemo(() => 
    nightfarerData.findIndex(item => item.character === activeNightfarer) || 0, 
    [nightfarerData, activeNightfarer]
  );

  const activeNightLordIndex = useMemo(() => 
    nightLordData.findIndex(item => item.character === activeNightLord) || 0, 
    [nightLordData, activeNightLord]
  );

  // Get max values for opacity scaling
  const maxNightfarerPlayed = useMemo(() => {
    return nightfarerData.length > 0 
      ? Math.max(...nightfarerData.map(d => d.played))
      : 1;
  }, [nightfarerData]);

  const maxNightLordPlayed = useMemo(() => {
    return nightLordData.length > 0 
      ? Math.max(...nightLordData.map(d => d.played))
      : 1;
  }, [nightLordData]);

  // Generate opacity based on games played
  // Reversed: More games = deeper purple (lower opacity), less games = lighter purple (higher opacity)
  const getOpacity = (played: number, maxPlayed: number) => {
    // Reverse the opacity calculation so that more played = deeper color
    // Now between 0.3 and 0.9 to avoid extremely dark/light colors
    return 0.9 - (played / maxPlayed) * 0.6;
  };

  // Base purple color
  const basePurple = "hsl(267 75% 50%)";

  // Active shape renderer for highlighted pie segment
  const activeShapeRenderer = ({
    outerRadius = 0,
    ...props
  }: PieSectorDataItem) => (
    <g>
      <Sector {...props} outerRadius={outerRadius + 10} />
      <Sector
        {...props}
        outerRadius={outerRadius + 25}
        innerRadius={outerRadius + 12}
      />
    </g>
  );

  // Custom tooltip content
  interface CharacterData {
    name: string;
    character: string;
    played: number;
    wins: number;
    losses: number;
    disconnects: number;
    win_rate: number;
    fillOpacity?: number;
  }

  type CustomTooltipProps = TooltipProps<number, string> & {
    payload?: Array<{ payload: CharacterData; color?: string }>;
  };

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const color = payload[0].color || basePurple;
      const opacity = data.fillOpacity || 1;
      
      return (
        <div className="bg-card border border-purple-900/20 rounded-lg p-2 shadow-md text-sm">
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: color, opacity }}
            />
            <p className="font-semibold">{data.name}</p>
          </div>
          <p>Games: {data.played}</p>
          <p>Wins: {data.wins} ({data.win_rate}%)</p>
          <p>Losses: {data.losses}</p>
        </div>
      );
    }
    return null;
  };
  
  // Generate a custom entry for the legend renderer
  const renderLegend = (nightfarerData.length > 0 || nightLordData.length > 0) ? {
    formatter: (value: string) => {
      // Return white text for the legend
      return <span style={{ color: "white" }}>{value}</span>;
    },
    payload: [
      { value: 'Most played', color: basePurple, fillOpacity: 0.3 },
      { value: 'Least played', color: basePurple, fillOpacity: 0.9 },
    ],
  } : undefined;

  // Selected character data
  const selectedNightfarer = activeNightfarerIndex >= 0 && nightfarerData.length > 0 
    ? nightfarerData[activeNightfarerIndex] 
    : null;

  const selectedNightLord = activeNightLordIndex >= 0 && nightLordData.length > 0
    ? nightLordData[activeNightLordIndex]
    : null;

  // Function to format dates
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  // Function to get the result color
  const getResultColor = (result: string) => {
    switch(result.toLowerCase()) {
      case 'win':
        return 'text-green-400';
      case 'loss':
        return 'text-red-400';
      case 'disconnect':
        return 'text-yellow-400';
      default:
        return 'text-muted-foreground';
    }
  };

  // Function to determine the display result and its value
  const getDisplayResultInfo = (session: SessionHistoryEntry) => {
    // For completed sessions with consensus result, use the consensus
    if (session.completed_at && session.consensus_result) {
      const consensusResult = session.consensus_result;
      console.log("!!!Consensus result:", consensusResult);
      return {
        text: consensusResult.charAt(0).toUpperCase() + consensusResult.slice(1).toLowerCase(),
        value: consensusResult.toLowerCase()
      };
    }
    
    // For completed sessions without a fetched consensus, use the player's result
    // (this should be accurate for most cases as completed sessions have consensus)
    if (session.completed_at) {
      const cleanResult = session.player_result.replace(/^"/, '').replace(/"$/, ''); // Remove quotes if present
      return {
        text: cleanResult.charAt(0).toUpperCase() + cleanResult.slice(1).toLowerCase(), // Capitalize first letter
        value: cleanResult.toLowerCase()
      };
    }
    
    // For non-completed sessions, show the individual result with a "Reported: " prefix
    const cleanResult = session.player_result.replace(/^"/, '').replace(/"$/, '');
    return {
      text: `Reported: ${cleanResult}`,
      value: cleanResult.toLowerCase()
    };
  };

  // Session History Section
  const renderSessionHistory = () => {
    // Show loading state
    if (isLoadingHistory) {
      return (
        <div className="text-center py-8 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          <p>Loading session history...</p>
        </div>
      );
    }

    // Show error state
    if (historyError) {
      return (
        <div className="text-center py-4 text-destructive">
          <p>Error loading session history: {historyError}</p>
        </div>
      );
    }

    // Filters section - always shown regardless of results
    const renderFilters = () => (
      <div className="mb-4 p-4 border border-purple-900/20 rounded-lg bg-background/50">
        <div className="flex flex-col md:flex-row gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Night Lord</label>
            <Select value={nightLordFilter} onValueChange={setNightLordFilter}>
              <SelectTrigger className="w-full h-10 bg-background">
                <SelectValue placeholder="Filter by Night Lord" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Night Lords</SelectItem>
                {isLoadingCharacterData ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  nightLords.map((lord) => (
                    <SelectItem key={lord.id} value={lord.name}>{lord.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Nightfarer</label>
            <Select value={nightfarerFilter} onValueChange={setNightfarerFilter}>
              <SelectTrigger className="w-full h-10 bg-background">
                <SelectValue placeholder="Filter by Nightfarer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nightfarers</SelectItem>
                {isLoadingCharacterData ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  nightfarers.map((farer) => (
                    <SelectItem key={farer.id} value={farer.name}>{farer.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Result</label>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-full h-10 bg-background">
                <SelectValue placeholder="Filter by Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="Win">Win</SelectItem>
                <SelectItem value="Loss">Loss</SelectItem>
                <SelectItem value="Disconnect">Disconnect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </div>
      </div>
    );

    // Show empty state - for when there's no session history at all
    if (sessionHistory.length === 0) {
      return (
        <div>
          {renderFilters()}
          <div className="text-center py-6 bg-background/50 border border-purple-900/20 rounded-lg">
            <p className="text-muted-foreground">No session history available yet.</p>
          </div>
        </div>
      );
    }
    
    // Show empty state when no sessions match the filter criteria
    if (filteredHistory.length === 0) {
      return (
        <div>
          {renderFilters()}
          <div className="text-center py-6 bg-background/50 border border-purple-900/20 rounded-lg">
            <p className="text-muted-foreground">No sessions match your filter criteria.</p>
            <Button
              variant="link"
              size="sm"
              onClick={resetFilters}
              className="mt-2"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      );
    }

    // Show results
    return (
      <div>
        {renderFilters()}
        
        <div className="bg-background/50 border border-purple-900/20 rounded-lg overflow-hidden">
          {/* Desktop view - Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Night Lord</TableHead>
                  <TableHead>Nightfarer</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-[80px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((session) => (
                  <TableRow key={session.session_id} className="hover:bg-purple-900/5">
                    <TableCell className="font-medium">{session.session_name}</TableCell>
                    <TableCell>{session.night_lord}</TableCell>
                    <TableCell>{session.player_nightfarer}</TableCell>
                    <TableCell>
                      <span className={getResultColor(getDisplayResultInfo(session).value)}>
                        {getDisplayResultInfo(session).text}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(session.created_at)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => openSessionDetails(session.session_id)}
                      >
                        <Info className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Mobile view - Cards */}
          <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
            {filteredHistory.map((session) => (
              <div key={session.session_id} className="p-3 border border-purple-900/20 rounded-lg bg-card/50 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-base">{session.session_name}</h3>
                  <span className={getResultColor(getDisplayResultInfo(session).value)}>
                    {getDisplayResultInfo(session).text}
                  </span>
                </div>
                <div className="text-sm space-y-1 mb-3">
                  <p><span className="text-muted-foreground">Night Lord:</span> {session.night_lord}</p>
                  <p><span className="text-muted-foreground">Nightfarer:</span> {session.player_nightfarer}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(session.created_at)}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => openSessionDetails(session.session_id)}
                >
                  <Info className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </div>
            ))}
          </div>
          
          {/* Pagination Controls */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-purple-900/20">
              <div className="text-sm text-muted-foreground hidden sm:block">
                Showing <span className="font-medium">{pagination.page * pagination.limit + 1}</span>
                {' '} to {' '}
                <span className="font-medium">
                  {Math.min((pagination.page + 1) * pagination.limit, pagination.total)}
                </span>
                {' '} of {' '}
                <span className="font-medium">{pagination.total}</span> sessions
              </div>
              {/* Mobile pagination info */}
              <div className="text-sm text-muted-foreground sm:hidden">
                Page {pagination.page + 1} of {pagination.total_pages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Function to fetch session details
  const fetchDetails = async (sessionId: string) => {
    if (!sessionId) return;
    
    try {
      setIsLoadingDetails(true);
      setDetailsError(null);
      // Use fetchWithAuth instead of fetchSessionDetails to ensure the token is properly included
      const response = await fetchWithAuth<SessionDetailResponse>(
        `/api/v1/statistics/sessions/${sessionId}`
      );
      setSessionDetails(response.data);
    } catch (err) {
      console.error('Error fetching session details:', err);
      setDetailsError(err instanceof Error ? err.message : 'Unknown error');
      setSessionDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  // Function to fetch friend status for current user
  const fetchFriendStatus = async () => {
    try {
      if (!sessionDetails) return;
      
      // Get the list of player IDs from the session details (excluding current user)
      const playerIds = sessionDetails.players
        .filter(player => player.user_id !== userData?.id)
        .map(player => player.user_id);
        
      if (playerIds.length === 0) return;
      
      // Use the new efficient endpoint
      const statusResponse = await UserService.checkFriendStatus(playerIds);
      
      setFriendStatus(prev => ({
        ...prev,
        friends: statusResponse.friends,
        pendingRequests: statusResponse.outgoing_requests,
        loading: {}
      }));
    } catch (err) {
      console.error('Error fetching friend status:', err);
      // We don't want to break the entire dialog if friend info fails
    }
  };
  
  // Function to send a friend request
  const sendFriendRequest = async (receiverId: string) => {
    try {
      // Set loading state for this specific user
      setFriendStatus(prev => ({
        ...prev,
        loading: { ...prev.loading, [receiverId]: true }
      }));
      
      await UserService.sendFriendRequest(receiverId);
      
      // Update pending requests list
      setFriendStatus(prev => ({
        ...prev,
        pendingRequests: [...prev.pendingRequests, receiverId],
        loading: { ...prev.loading, [receiverId]: false }
      }));
      
      setNotification({
        message: "Your friend request has been sent successfully.",
        type: "success"
      });
      
      // Auto clear notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    } catch (err) {
      console.error('Error sending friend request:', err);
      
      let errorMessage = "Failed to send friend request.";
      if (err instanceof Error) {
        if (err.message.includes("already exists")) {
          errorMessage = "Friend request already exists or you are already friends.";
        }
      }
      
      setNotification({
        message: errorMessage,
        type: "error"
      });
      
      // Reset loading state
      setFriendStatus(prev => ({
        ...prev,
        loading: { ...prev.loading, [receiverId]: false }
      }));
    }
  };
  
  // Function to clear notification
  const clearNotification = () => {
    setNotification(null);
  };
  
  // Function to open session details dialog
  const openSessionDetails = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsDetailsDialogOpen(true);
    fetchDetails(sessionId);
    fetchFriendStatus();
  };
  
  return (
    <div className="container mx-auto py-6 md:py-8 px-4 md:px-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gradient bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-400">Dashboard</h1>
      
      {notification && (
        <div className="mb-4">
          <Notification 
            notification={notification}
            onDismiss={clearNotification}
          />
        </div>
      )}
      
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 md:p-6 backdrop-blur-sm">
        <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-4">Welcome, {userData?.username || 'Tarnished'} !</h2>
        <p className="text-muted-foreground mb-4 md:mb-6 text-sm md:text-base">
          This is your personal dashboard where you can track your game statistics.
        </p>
        
        {isLoading ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p>Loading your statistics...</p>
          </div>
        ) : noStatsYet ? (
          <div className="text-center py-8 bg-background/50 border border-purple-900/20 rounded-lg">
            <h3 className="font-medium text-lg mb-2">No Statistics Yet</h3>
            <p className="text-muted-foreground">
              You haven&apos;t played any games yet. Your statistics will appear here after your first match.
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>Error loading statistics: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-600 transition-colors rounded-md text-white"
            >
              Try Again
            </button>
          </div>
        ) : !stats ? (
          <div className="text-center py-8">
            <p>No statistics available yet. Play some games to see your stats!</p>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="mb-6">
              <h3 className="font-medium text-base md:text-lg mb-3 md:mb-4 border-b border-purple-900/20 pb-2">Overall Statistics</h3>
              <div className="bg-background/50 border border-purple-900/20 rounded-lg p-3 md:p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <div className="p-2 md:p-3 rounded-md bg-purple-900/10">
                    <p className="text-xs md:text-sm text-muted-foreground">Total Games</p>
                    <p className="text-xl md:text-2xl font-bold text-purple-400">{stats.total_games}</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-md bg-green-900/10">
                    <p className="text-xs md:text-sm text-muted-foreground">Wins</p>
                    <p className="text-xl md:text-2xl font-bold text-green-400">{stats.wins}</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-md bg-red-900/10">
                    <p className="text-xs md:text-sm text-muted-foreground">Losses</p>
                    <p className="text-xl md:text-2xl font-bold text-red-400">{stats.losses}</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-md bg-yellow-900/10">
                    <p className="text-xs md:text-sm text-muted-foreground">Disconnects</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-400">{stats.disconnects}</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-md bg-indigo-900/10">
                    <p className="text-xs md:text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-xl md:text-2xl font-bold text-indigo-400">{stats.win_rate}%</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Character Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              {/* Nightfarer Stats */}
              <Card className="flex flex-col transition-shadow hover:shadow-md">
                <CardHeader className="flex-row items-start space-y-0 pb-0">
                  <div>
                    <CardTitle className="text-base md:text-lg">Nightfarer Stats</CardTitle>
                  </div>
                  {nightfarerData.length > 0 && (
                    <Select 
                      value={activeNightfarer || ''}
                      onValueChange={setActiveNightfarer}
                    >
                      <SelectTrigger className="ml-auto h-7 w-[160px] rounded-lg pl-2.5">
                        <SelectValue placeholder="Select character" />
                      </SelectTrigger>
                      <SelectContent align="end" className="rounded-xl">
                        {nightfarerData.map((item) => (
                          <SelectItem 
                            key={item.character} 
                            value={item.character}
                            className="rounded-lg [&_span]:flex"
                          >
                            <div className="flex items-center gap-2 text-xs">
                              <span
                                className="flex h-3 w-3 shrink-0 rounded-sm"
                                style={{
                                  backgroundColor: basePurple,
                                  opacity: getOpacity(item.played, maxNightfarerPlayed)
                                }}
                              />
                              {item.character}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardHeader>
                <CardContent className="flex-1 pb-0 pt-2">
                  {nightfarerData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                      No Nightfarer data available
                    </div>
                  ) : (
                    <div className="w-full h-[250px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            formatter={renderLegend?.formatter}
                            payload={renderLegend?.payload}
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            iconSize={10}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '12px', marginTop: '10px' }}
                          />
                          <Pie
                            data={nightfarerData.map(entry => ({
                              ...entry,
                              fillOpacity: getOpacity(entry.played, maxNightfarerPlayed)
                            }))}
                            dataKey="played"
                            nameKey="character"
                            innerRadius={60}
                            strokeWidth={0}
                            paddingAngle={0}
                            animationDuration={animateCharts ? 1000 : 0}
                            animationBegin={0}
                            activeIndex={activeNightfarerIndex}
                            activeShape={activeShapeRenderer}
                          >
                            {nightfarerData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={basePurple}
                                fillOpacity={getOpacity(entry.played, maxNightfarerPlayed)}
                              />
                            ))}
                            <Label
                              content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox && selectedNightfarer) {
                                  return (
                                    <text
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                    >
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) - 10}
                                        className="fill-foreground text-2xl md:text-3xl font-bold"
                                        fill="hsl(var(--foreground))"
                                      >
                                        {selectedNightfarer.played}
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 14}
                                        className="fill-muted-foreground text-sm"
                                        fill="hsl(var(--muted-foreground))"
                                      >
                                        Games
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 32}
                                        className="fill-muted-foreground text-xs"
                                        fill="hsl(var(--muted-foreground))"
                                      >
                                        Win rate: {selectedNightfarer.win_rate}%
                                      </tspan>
                                    </text>
                                  )
                                }
                                return null;
                              }}
                            />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Night Lord Stats */}
              <Card className="flex flex-col transition-shadow hover:shadow-md">
                <CardHeader className="flex-row items-start space-y-0 pb-0">
              <div>
                    <CardTitle className="text-base md:text-lg">Night Lord Stats</CardTitle>
                  </div>
                  {nightLordData.length > 0 && (
                    <Select 
                      value={activeNightLord || ''}
                      onValueChange={setActiveNightLord}
                    >
                      <SelectTrigger className="ml-auto h-7 w-[160px] rounded-lg pl-2.5">
                        <SelectValue placeholder="Select character" />
                      </SelectTrigger>
                      <SelectContent align="end" className="rounded-xl">
                        {nightLordData.map((item) => (
                          <SelectItem 
                            key={item.character} 
                            value={item.character}
                            className="rounded-lg [&_span]:flex"
                          >
                            <div className="flex items-center gap-2 text-xs">
                              <span
                                className="flex h-3 w-3 shrink-0 rounded-sm"
                                style={{
                                  backgroundColor: basePurple,
                                  opacity: getOpacity(item.played, maxNightLordPlayed)
                                }}
                              />
                              {item.character}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardHeader>
                <CardContent className="flex-1 pb-0 pt-2">
                  {nightLordData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                      No Night Lord data available
                    </div>
                  ) : (
                    <div className="w-full h-[250px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                            formatter={renderLegend?.formatter}
                            payload={renderLegend?.payload}
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            iconSize={10}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '12px', marginTop: '10px' }}
                          />
                          <Pie
                            data={nightLordData.map(entry => ({
                              ...entry,
                              fillOpacity: getOpacity(entry.played, maxNightLordPlayed)
                            }))}
                            dataKey="played"
                            nameKey="character"
                            innerRadius={60}
                            strokeWidth={0}
                            paddingAngle={0}
                            animationDuration={animateCharts ? 1000 : 0}
                            animationBegin={0}
                            activeIndex={activeNightLordIndex}
                            activeShape={activeShapeRenderer}
                          >
                            {nightLordData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={basePurple}
                                fillOpacity={getOpacity(entry.played, maxNightLordPlayed)}
                              />
                            ))}
                            <Label
                              content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox && selectedNightLord) {
                                  return (
                                    <text
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                    >
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) - 10}
                                        className="fill-foreground text-2xl md:text-3xl font-bold"
                                        fill="hsl(var(--foreground))"
                                      >
                                        {selectedNightLord.played}
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 14}
                                        className="fill-muted-foreground text-sm"
                                        fill="hsl(var(--muted-foreground))"
                                      >
                                        Games
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy || 0) + 32}
                                        className="fill-muted-foreground text-xs"
                                        fill="hsl(var(--muted-foreground))"
                                      >
                                        Win rate: {selectedNightLord.win_rate}%
                                      </tspan>
                                    </text>
                                  )
                                }
                                return null;
                              }}
                            />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Session History */}
            <div className="mb-6">
              <h3 className="font-medium text-base md:text-lg mb-3 md:mb-4 border-b border-purple-900/20 pb-2">
                Recent Session History
              </h3>
              {renderSessionHistory()}
            </div>
            
            {/* Empty State - for when there's no data */}
            {stats.total_games === 0 && (
              <div className="mt-6 p-6 border border-purple-900/20 rounded-lg bg-background/50 text-center">
                <h3 className="font-medium text-lg mb-2">No Games Played Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Join a game to start seeing your statistics here.
                </p>
              </div>
            )}
          </>
        )}

        {/* Session details dialog */}
        <AlertDialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <AlertDialogContent className="max-w-[90vw] w-[500px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg">
                {isLoadingDetails ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> 
                    Loading session details...
                  </div>
                ) : detailsError ? (
                  <span className="text-destructive">Error loading details</span>
                ) : (
                  <>Session: {sessionDetails?.session_name || 'Unknown'} <span className="text-xs text-muted-foreground">({selectedSessionId})</span></>
                )}
              </AlertDialogTitle>
              <div className="text-sm text-muted-foreground mt-2">
                {isLoadingDetails ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : detailsError ? (
                  <div className="text-destructive text-center py-4">
                    {detailsError}
                  </div>
                ) : sessionDetails ? (
                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Night Lord</div>
                        <div className="font-medium">{sessionDetails.night_lord}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Status</div>
                        <div className="font-medium">{sessionDetails.status}</div>
                      </div>
                      {sessionDetails.completed_at && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Completed</div>
                          <div className="text-sm">{formatDate(sessionDetails.completed_at)}</div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium mb-2">Players</div>
                      <div className="border border-purple-900/20 rounded-md overflow-hidden">
                        <div className="relative w-full overflow-auto">
                          <table className="w-full caption-bottom text-sm">
                            <thead>
                              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-10 px-2 text-left align-middle font-medium">Player</th>
                                <th className="h-10 px-2 text-left align-middle font-medium">Nightfarer</th>
                                <th className="h-10 px-2 text-left align-middle font-medium">Result</th>
                                <th className="h-10 px-2 text-left align-middle font-medium">Friend</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sessionDetails.players.map((player) => {
                                const isSelf = player.user_id === userData?.id;
                                const isFriend = friendStatus.friends.includes(player.user_id);
                                const hasPendingRequest = friendStatus.pendingRequests.includes(player.user_id);
                                const isLoading = !!friendStatus.loading[player.user_id];
                                
                                return (
                                  <tr key={player.user_id} className="border-b transition-colors hover:bg-purple-900/5">
                                    <td className="p-2 align-middle">{player.username}</td>
                                    <td className="p-2 align-middle">{player.nightfarer}</td>
                                    <td className="p-2 align-middle">
                                      {player.result ? (
                                        <span className={getResultColor(player.result)}>
                                          {player.result}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">No result</span>
                                      )}
                                    </td>
                                    <td className="p-2 align-middle">
                                      {!isSelf && (
                                        isFriend ? (
                                          <span className="text-green-500 flex items-center gap-1 text-xs">
                                            <Check className="h-3 w-3" /> Friends
                                          </span>
                                        ) : hasPendingRequest ? (
                                          <span className="text-orange-500 text-xs">Request sent</span>
                                        ) : (
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-7 w-7 p-0 rounded-full"
                                            onClick={() => sendFriendRequest(player.user_id)}
                                            disabled={isLoading}
                                          >
                                            {isLoading ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <UserPlus className="h-3.5 w-3.5" />
                                            )}
                                            <span className="sr-only">Add friend</span>
                                          </Button>
                                        )
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No session details available
                  </div>
                )}
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <Footer />
    </div>
  );
} 