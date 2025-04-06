"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Label, Legend, Pie, PieChart, ResponsiveContainer, Sector, Tooltip, TooltipProps } from "recharts";
import { Loader2, ChevronLeft, ChevronRight, Info } from "lucide-react";
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
  SessionDetailResponse
} from "@/utils/api";
import { formatDistanceToNow } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [nightLordFilter, setNightLordFilter] = useState<string>('');
  const [nightfarerFilter, setNightfarerFilter] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<string>('');
  
  // Session details dialog state
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

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

    const fetchSessionHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const response = await fetchWithAuth<PaginatedResponse<PaginatedSessionHistory>>(
          `/api/v1/statistics/users/me/sessions?page=1&limit=10`
        );
        
        // Convert from 1-indexed to 0-indexed
        if (response.data && response.data.pagination) {
          response.data.pagination.page -= 1;
        }
        
        setSessionHistory(response.data.sessions);
        setFilteredHistory(response.data.sessions);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error('Error fetching session history:', err);
        setHistoryError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchStats();
    fetchSessionHistory();
  }, [fetchWithAuth]);
  
  // Apply filters to session history
  useEffect(() => {
    if (sessionHistory.length === 0) {
      setFilteredHistory([]);
      return;
    }
    
    let filtered = [...sessionHistory];
    
    if (nightLordFilter) {
      filtered = filtered.filter(session => 
        session.night_lord.toLowerCase().includes(nightLordFilter.toLowerCase())
      );
    }
    
    if (nightfarerFilter) {
      filtered = filtered.filter(session => 
        session.player_nightfarer.toLowerCase().includes(nightfarerFilter.toLowerCase())
      );
    }
    
    if (resultFilter) {
      filtered = filtered.filter(session => 
        session.player_result.toLowerCase() === resultFilter.toLowerCase()
      );
    }
    
    setFilteredHistory(filtered);
  }, [sessionHistory, nightLordFilter, nightfarerFilter, resultFilter]);

  // Function to handle page change
  const handlePageChange = async (newPage: number) => {
    if (newPage < 0 || newPage >= pagination.total_pages) {
      return;
    }
    
    // Reset filters when changing pages since pagination happens at the backend
    resetFilters();
    
    try {
      setIsLoadingHistory(true);
      const response = await fetchWithAuth<PaginatedResponse<PaginatedSessionHistory>>(
        `/api/v1/statistics/users/me/sessions?page=${newPage + 1}&limit=${pagination.limit}`
      );
      
      // Convert from 1-indexed to 0-indexed
      if (response.data && response.data.pagination) {
        response.data.pagination.page -= 1;
      }
      
      setSessionHistory(response.data.sessions);
      setFilteredHistory(response.data.sessions);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching session history page:', err);
      setHistoryError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setNightLordFilter('');
    setNightfarerFilter('');
    setResultFilter('');
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

  // Session History Section
  const renderSessionHistory = () => {
    if (isLoadingHistory) {
      return (
        <div className="text-center py-8 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          <p>Loading session history...</p>
        </div>
      );
    }

    if (historyError) {
      return (
        <div className="text-center py-4 text-destructive">
          <p>Error loading session history: {historyError}</p>
        </div>
      );
    }

    if (sessionHistory.length === 0) {
      return (
        <div className="text-center py-6 bg-background/50 border border-purple-900/20 rounded-lg">
          <p className="text-muted-foreground">No session history available yet.</p>
        </div>
      );
    }
    
    // If we have sessions but all are filtered out
    if (filteredHistory.length === 0 && sessionHistory.length > 0) {
      return (
        <div>
          {/* Filters */}
          <div className="mb-4 p-4 border border-purple-900/20 rounded-lg bg-background/50">
            <div className="flex flex-col md:flex-row gap-3 mb-3">
              <div className="flex-1">
                <label htmlFor="night-lord-filter" className="block text-sm font-medium mb-1">Night Lord</label>
                <input
                  id="night-lord-filter"
                  type="text"
                  className="w-full p-2 rounded-md border bg-background"
                  placeholder="Filter by Night Lord"
                  value={nightLordFilter}
                  onChange={(e) => setNightLordFilter(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="nightfarer-filter" className="block text-sm font-medium mb-1">Nightfarer</label>
                <input
                  id="nightfarer-filter"
                  type="text"
                  className="w-full p-2 rounded-md border bg-background"
                  placeholder="Filter by Nightfarer"
                  value={nightfarerFilter}
                  onChange={(e) => setNightfarerFilter(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="result-filter" className="block text-sm font-medium mb-1">Result</label>
                <select
                  id="result-filter"
                  className="w-full p-2 rounded-md border bg-background"
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                >
                  <option value="">All Results</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="disconnect">Disconnect</option>
                </select>
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

    return (
      <div>
        {/* Filters */}
        <div className="mb-4 p-4 border border-purple-900/20 rounded-lg bg-background/50">
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <div className="flex-1">
              <label htmlFor="night-lord-filter" className="block text-sm font-medium mb-1">Night Lord</label>
              <input
                id="night-lord-filter"
                type="text"
                className="w-full p-2 rounded-md border bg-background"
                placeholder="Filter by Night Lord"
                value={nightLordFilter}
                onChange={(e) => setNightLordFilter(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="nightfarer-filter" className="block text-sm font-medium mb-1">Nightfarer</label>
              <input
                id="nightfarer-filter"
                type="text"
                className="w-full p-2 rounded-md border bg-background"
                placeholder="Filter by Nightfarer"
                value={nightfarerFilter}
                onChange={(e) => setNightfarerFilter(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="result-filter" className="block text-sm font-medium mb-1">Result</label>
              <select
                id="result-filter"
                className="w-full p-2 rounded-md border bg-background"
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
              >
                <option value="">All Results</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="disconnect">Disconnect</option>
              </select>
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
                      <span className={getResultColor(session.player_result)}>
                        {session.player_result}
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
                  <span className={getResultColor(session.player_result)}>
                    {session.player_result}
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
  
  // Function to open session details dialog
  const openSessionDetails = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsDetailsDialogOpen(true);
    fetchDetails(sessionId);
  };
  
  return (
    <div className="container mx-auto py-6 md:py-8 px-4 md:px-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Dashboard</h1>
      
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 md:p-6 backdrop-blur-sm">
        <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-4">Welcome, {userData?.displayName || userData?.username || 'Ashen One'}</h2>
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
              <AlertDialogDescription>
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
                        <p className="text-xs text-muted-foreground mb-1">Night Lord</p>
                        <p className="font-medium">{sessionDetails.night_lord}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <p className="font-medium">{sessionDetails.status}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Created</p>
                        <p className="text-sm">{formatDate(sessionDetails.created_at)}</p>
                      </div>
                      {sessionDetails.completed_at && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Completed</p>
                          <p className="text-sm">{formatDate(sessionDetails.completed_at)}</p>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Players</h4>
                      <div className="border border-purple-900/20 rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Player</TableHead>
                              <TableHead>Nightfarer</TableHead>
                              <TableHead>Result</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sessionDetails.players.map((player) => (
                              <TableRow key={player.user_id} className="hover:bg-purple-900/5">
                                <TableCell className="py-2">{player.username}</TableCell>
                                <TableCell className="py-2">{player.nightfarer}</TableCell>
                                <TableCell className="py-2">
                                  {player.result ? (
                                    <span className={getResultColor(player.result)}>
                                      {player.result}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">No result</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
            </div>
          </div>
        </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No session details available
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 