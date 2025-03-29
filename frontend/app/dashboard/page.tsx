"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Label, Pie, PieChart, Tooltip, TooltipProps } from "recharts";
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart";

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await fetchWithAuth<UserStats>('/api/v1/statistics/users/me');
        setStats(data);
      } catch (err) {
        console.error('Error fetching user statistics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [fetchWithAuth]);

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

  // Generate opacity based on games played (more games = more opaque)
  const getOpacity = (played: number, maxPlayed: number) => {
    // Calculate opacity between 0.2 (minimum) and 1.0 (maximum)
    // This ensures even low-count entries are still somewhat visible
    return 0.2 + (played / maxPlayed) * 0.8;
  };

  // Base purple color
  const basePurple = "hsl(267 75% 50%)";

  const chartConfig: ChartConfig = {
    played: { label: "Games Played" },
    character: { label: "Character" },
  };

  const totalNightfarerGames = useMemo(() => {
    return nightfarerData.reduce((acc, curr) => acc + curr.played, 0);
  }, [nightfarerData]);

  const totalNightLordGames = useMemo(() => {
    return nightLordData.reduce((acc, curr) => acc + curr.played, 0);
  }, [nightLordData]);

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
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-6 backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-4">Welcome, {userData?.displayName || userData?.username || 'Ashen One'}</h2>
        <p className="text-muted-foreground mb-6">
          This is your personal dashboard where you can track your game statistics.
        </p>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading your statistics...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>Error loading statistics: {error}</p>
          </div>
        ) : !stats ? (
          <div className="text-center py-8">
            <p>No statistics available yet. Play some games to see your stats!</p>
          </div>
        ) : (
          <>
            {/* Overall Stats */}
            <div className="mb-6">
              <h3 className="font-medium text-lg mb-4">Overall Statistics</h3>
              <div className="bg-background/50 border border-purple-900/20 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Games</p>
                    <p className="text-2xl font-bold text-purple-400">{stats.total_games}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Wins</p>
                    <p className="text-2xl font-bold text-green-400">{stats.wins}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Losses</p>
                    <p className="text-2xl font-bold text-red-400">{stats.losses}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Disconnects</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.disconnects}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold text-indigo-400">{stats.win_rate}%</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Character Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nightfarer Stats */}
              <Card className="flex flex-col">
                <CardHeader className="items-center pb-0">
                  <CardTitle>Nightfarer Stats</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                  >
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
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
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-3xl font-bold"
                                    fill="hsl(var(--foreground))"
                                  >
                                    {totalNightfarerGames}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 24}
                                    className="fill-muted-foreground"
                                    fill="hsl(var(--muted-foreground))"
                                  >
                                    Games
                                  </tspan>
                                </text>
                              )
                            }
                            return null;
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Night Lord Stats */}
              <Card className="flex flex-col">
                <CardHeader className="items-center pb-0">
                  <CardTitle>Night Lord Stats</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                  <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                  >
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
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
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-3xl font-bold"
                                    fill="hsl(var(--foreground))"
                                  >
                                    {totalNightLordGames}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 24}
                                    className="fill-muted-foreground"
                                    fill="hsl(var(--muted-foreground))"
                                  >
                                    Games
                                  </tspan>
                                </text>
                              )
                            }
                            return null;
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 