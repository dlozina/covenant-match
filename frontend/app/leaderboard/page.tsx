"use client";

import { useState, useEffect, Suspense } from "react";
import { MainLayout } from "@/components/layout";
import { Trophy, Users, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardEntryResponseDto, CovenantStats, fetchLeaderboard, fetchCovenantStats } from "@/utils/api";
import { Footer } from "@/components/layout/Footer";
import { useSearchParams } from "next/navigation";

// Client component that uses useSearchParams
function LeaderboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [players, setPlayers] = useState<LeaderboardEntryResponseDto[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [covenants, setCovenants] = useState<CovenantStats[]>([]);
  const [isLoadingCovenants, setIsLoadingCovenants] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(tabParam === 'covenants' ? 'covenants' : 'players');

  useEffect(() => {
    const getLeaderboard = async () => {
      try {
        setIsLoadingPlayers(true);
        const data = await fetchLeaderboard(20); // Get top 20 players
        // Sort by score (descending), then by username (ascending) when scores are equal
        const sortedPlayers = [...data].sort((a, b) => 
          b.score === a.score ? a.username.localeCompare(b.username) : b.score - a.score
        );
        setPlayers(sortedPlayers);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    const getCovenantStats = async () => {
      try {
        setIsLoadingCovenants(true);
        const data = await fetchCovenantStats();
        // Check if covenantStats exists and has items
        if (data && data.covenantStats && data.covenantStats.length > 0) {
          // Sort by wins (descending) and then by covenantName (ascending) when wins are equal
          const sortedCovenants = [...data.covenantStats].sort((a, b) => 
            b.wins === a.wins ? a.covenantName.localeCompare(b.covenantName) : b.wins - a.wins
          );
          setCovenants(sortedCovenants);
        } else {
          // If no covenant stats exist, set empty array
          setCovenants([]);
          console.log("No covenant statistics available");
        }
      } catch (error) {
        console.error("Failed to fetch covenant stats:", error);
        setCovenants([]);
      } finally {
        setIsLoadingCovenants(false);
      }
    };

    getLeaderboard();
    getCovenantStats();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col items-center justify-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-200">
          Nightreign Leaderboards
        </h1>
        <p className="text-muted-foreground text-center mt-2 max-w-2xl">
          View the top players and covenants in Nightreign. Glory awaits the worthy.
        </p>
      </div>

      <Tabs 
        defaultValue="players" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full max-w-5xl mx-auto"
      >
        <div className="flex justify-center mb-6">
          <TabsList className="bg-background/50 border border-accent/20 backdrop-blur-sm">
            <TabsTrigger 
              value="players" 
              className="flex items-center gap-2 data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-200"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Players</span>
            </TabsTrigger>
            <TabsTrigger 
              value="covenants" 
              className="flex items-center gap-2 data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-200"
            >
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Covenants</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="players" className="w-full">
          <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 shadow-md backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <Trophy className="h-5 w-5 mr-2 text-amber-400" />
              <h2 className="text-xl font-bold">Top Players</h2>
            </div>

            {isLoadingPlayers ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-8 w-8 bg-purple-900/30 rounded-full mb-4"></div>
                  <div className="h-4 w-32 bg-purple-900/30 rounded mb-2"></div>
                  <div className="h-3 w-48 bg-purple-900/20 rounded"></div>
                </div>
              </div>
            ) : players.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-purple-900/20">
                      <th className="px-3 py-3 text-left">Rank</th>
                      <th className="px-3 py-3 text-left">Player</th>
                      <th className="px-3 py-3 text-right">Score</th>
                      <th className="px-3 py-3 text-right">Wins</th>
                      <th className="px-3 py-3 text-right hidden md:table-cell">Total Games</th>
                      <th className="px-3 py-3 text-right hidden md:table-cell">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-purple-900/10 hover:bg-purple-900/10 transition-colors"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center">
                            <div className={`rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium ${
                              index < 3 
                                ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white" 
                                : "bg-gradient-to-br from-purple-700 to-indigo-900 text-white"
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-medium">{player.username}</td>
                        <td className="px-3 py-3 text-right text-purple-400">{player.score.toFixed(2)}</td>
                        <td className="px-3 py-3 text-right text-green-400">{player.wins}</td>
                        <td className="px-3 py-3 text-right hidden md:table-cell">{player.totalGames}</td>
                        <td className="px-3 py-3 text-right hidden md:table-cell">
                          <div className="inline-block px-2 py-1 rounded bg-purple-900/20 text-xs">
                            {player.winRate.toFixed(2)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 text-xs text-muted-foreground italic text-center">
                  Score = (Wins ÷ Total Games) × (1 + Activity Bonus) | Activity Bonus = 0.02
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No player data available
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="covenants" className="w-full">
          <div className="bg-card/50 border border-indigo-900/20 rounded-lg p-4 shadow-md backdrop-blur-sm">
            <div className="flex items-center mb-4">
              <Award className="h-5 w-5 mr-2 text-red-400" />
              <h2 className="text-xl font-bold">Covenant Rankings</h2>
            </div>

            {isLoadingCovenants ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-8 w-8 bg-indigo-900/30 rounded-full mb-4"></div>
                  <div className="h-4 w-32 bg-indigo-900/30 rounded mb-2"></div>
                  <div className="h-3 w-48 bg-indigo-900/20 rounded"></div>
                </div>
              </div>
            ) : covenants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-indigo-900/20">
                      <th className="px-3 py-3 text-left">Rank</th>
                      <th className="px-3 py-3 text-left">Covenant</th>
                      <th className="px-3 py-3 text-right">Wins</th>
                      <th className="px-3 py-3 text-right hidden md:table-cell">Losses</th>
                      <th className="px-3 py-3 text-right hidden md:table-cell">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {covenants.map((covenant, index) => {
                      const totalGames = covenant.wins + covenant.losses;
                      const winRate = totalGames > 0 
                        ? (covenant.wins / totalGames) * 100 
                        : 0;
                      
                      return (
                        <tr 
                          key={index} 
                          className="border-b border-indigo-900/10 hover:bg-indigo-900/10 transition-colors"
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-center">
                              <div className={`rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium ${
                                index < 3 
                                  ? "bg-gradient-to-br from-red-700 to-amber-600 text-white" 
                                  : "bg-gradient-to-br from-indigo-700 to-blue-900 text-white"
                              }`}>
                                {index + 1}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-medium">{covenant.covenantName}</td>
                          <td className="px-3 py-3 text-right text-green-400">{covenant.wins}</td>
                          <td className="px-3 py-3 text-right text-red-400 hidden md:table-cell">{covenant.losses}</td>
                          <td className="px-3 py-3 text-right hidden md:table-cell">
                            <div className="inline-block px-2 py-1 rounded bg-indigo-900/20 text-xs">
                              {winRate.toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-3 text-xs text-muted-foreground italic text-center">
                  Score = (Wins ÷ Total Games) × (1 + Activity Bonus) | Activity Bonus = 0.02
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No covenant data available
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <MainLayout footer={<Footer />}>
      <Suspense fallback={
        <div className="container mx-auto py-12 text-center">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-card/50 rounded-md w-64 mx-auto"></div>
            <div className="h-4 bg-card/30 rounded-md w-96 mx-auto"></div>
            <div className="h-[400px] bg-card/50 rounded-lg w-full max-w-5xl mx-auto"></div>
          </div>
        </div>
      }>
        <LeaderboardContent />
      </Suspense>
    </MainLayout>
  );
} 