"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { MainLayout } from "@/components/layout";
import { Sword, Shield, Timer, Users, Trophy, Skull, ScrollText, Compass, Award, AlertCircle } from "lucide-react";
// Use for test if css config is not working
// import { TestStyled } from "@/components/ui/test-styled";
// import { BasicTest } from "@/components/ui/basic-test";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { 
  LeaderboardEntry, 
  CovenantStats,
  NewsItem,
  Announcement,
  fetchLeaderboard, 
  fetchSessionsCount,
  fetchCovenantStats,
  fetchRecentNews,
  fetchAnnouncement 
} from "@/utils/api";

export default function Home() {
  const { isLoggedIn, isLoading } = useAuth();
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [isLoadingActiveSessions, setIsLoadingActiveSessions] = useState(true);
  const [topCovenants, setTopCovenants] = useState<CovenantStats[]>([]);
  const [isLoadingCovenants, setIsLoadingCovenants] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoadingAnnouncement, setIsLoadingAnnouncement] = useState(true);

  useEffect(() => {
    const getLeaderboard = async () => {
      try {
        setIsLoadingLeaderboard(true);
        const data = await fetchLeaderboard();
        // Sort first by wins (descending), then by username (ascending) when wins are equal
        const sortedPlayers = [...data].sort((a, b) => 
          b.wins === a.wins ? a.username.localeCompare(b.username) : b.wins - a.wins
        );
        setTopPlayers(sortedPlayers.slice(0, 3)); // Get top 3 players
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };

    const getActiveSessions = async () => {
      try {
        setIsLoadingActiveSessions(true);
        console.log('Before fetching active sessions count');
        // Fetch only Open sessions for the "Active Sessions" widget
        const count = await fetchSessionsCount("Open");
        console.log('After fetching active sessions count:', count);
        setActiveSessions(count);
      } catch (error) {
        console.error("Failed to fetch active sessions count:", error);
      } finally {
        setIsLoadingActiveSessions(false);
      }
    };

    const getTopCovenants = async () => {
      try {
        setIsLoadingCovenants(true);
        const data = await fetchCovenantStats();
        // Check if covenantStats exists and has items
        if (data && data.covenantStats && data.covenantStats.length > 0) {
          // Sort by wins (descending) and then by covenantName (ascending) when wins are equal
          const sortedCovenants = [...data.covenantStats].sort((a, b) => 
            b.wins === a.wins ? a.covenantName.localeCompare(b.covenantName) : b.wins - a.wins
          );
          setTopCovenants(sortedCovenants.slice(0, 3));
        } else {
          // If no covenant stats exist, set empty array
          setTopCovenants([]);
          console.log("No covenant statistics available");
        }
      } catch (error) {
        console.error("Failed to fetch covenant stats:", error);
        setTopCovenants([]); // Set empty array on error too
      } finally {
        setIsLoadingCovenants(false);
      }
    };

    const getNews = async () => {
      try {
        setIsLoadingNews(true);
        console.log('Fetching recent news...');
        const newsData = await fetchRecentNews(6); // Only show top 6 news items on homepage
        console.log('News data received:', newsData);
        
        if (Array.isArray(newsData)) {
          setNews(newsData);
        } else {
          console.error('News data is not an array:', newsData);
          setNews([]);
        }
      } catch (error) {
        console.error("Failed to fetch news:", error);
        setNews([]);
      } finally {
        setIsLoadingNews(false);
      }
    };

    const getAnnouncement = async () => {
      try {
        setIsLoadingAnnouncement(true);
        const data = await fetchAnnouncement();
        setAnnouncement(data);
      } catch (error) {
        console.error("Failed to fetch announcement:", error);
        setAnnouncement(null);
      } finally {
        setIsLoadingAnnouncement(false);
      }
    };

    getLeaderboard();
    getActiveSessions();
    getTopCovenants();
    getNews();
    getAnnouncement();
  }, []);

  // Add custom sidebars with improved styling
  const leftSidebar = (
    <div className="h-full space-y-6 py-4">
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 backdrop-blur-sm">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span>Top Players</span>
        </h3>
        <div className="space-y-3">
          {isLoadingLeaderboard ? (
            <div className="py-2 text-sm text-muted-foreground">Loading leaderboard...</div>
          ) : topPlayers.length > 0 ? (
            topPlayers.map((player, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 h-6 w-6 flex-shrink-0 flex items-center justify-center text-xs">
                    {i+1}
                  </div>
                  <span className="truncate">{player.username}</span>
                </div>
                <span className="text-indigo-400 flex-shrink-0">{player.wins} W</span>
              </div>
            ))
          ) : (
            <div className="py-2 text-sm text-muted-foreground">No players found</div>
          )}
        </div>
      </div>
      
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 backdrop-blur-sm">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
          <Award className="h-5 w-5 text-red-400" />
          <span>Top Covenants</span>
        </h3>
        <div className="space-y-3">
          {isLoadingCovenants ? (
            <div className="py-2 text-sm text-muted-foreground">Loading covenants...</div>
          ) : topCovenants.length > 0 ? (
            topCovenants.map((covenant, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="rounded-full bg-gradient-to-br from-red-700 to-amber-600 h-6 w-6 flex-shrink-0 flex items-center justify-center text-xs">
                    {i+1}
                  </div>
                  <span className="truncate">{covenant.covenantName}</span>
                </div>
                <span className="text-red-400 flex-shrink-0">{covenant.wins} W</span>
              </div>
            ))
          ) : (
            <div className="py-2 text-sm text-muted-foreground">No covenant data found</div>
          )}
        </div>
      </div>
      
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 backdrop-blur-sm">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
          <Timer className="h-5 w-5 text-emerald-400" />
          <span>Open Sessions</span>
        </h3>
        <div className="text-4xl font-bold text-center py-2 text-emerald-400">
          {isLoadingActiveSessions ? (
            <span className="text-lg text-muted-foreground">Loading...</span>
          ) : (
            activeSessions
          )}
        </div>
        <div className="text-xs text-center text-muted-foreground">
          Players looking for groups now
        </div>
      </div>
    </div>
  );
  
  const rightSidebar = (
    <div className="h-full space-y-6 py-4">
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 backdrop-blur-sm">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
          <ScrollText className="h-5 w-5 text-blue-400" />
          <span>News & Updates</span>
        </h3>
        <div className="space-y-4">
          {isLoadingNews ? (
            <div className="py-2 text-sm text-muted-foreground">Loading news...</div>
          ) : Array.isArray(news) && news.length > 0 ? (
            news.map((item, i) => (
              <div key={i} className="border-b border-purple-900/20 pb-3">
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.summary}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-purple-400">{item.time_ago || "Recently"}</p>
                  <Link href={`/news/${item.id}`} className="text-xs text-blue-400 hover:underline">
                    Read more
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="py-2 text-sm text-muted-foreground">No news available</div>
          )}
          <div className="pt-2 text-center">
            <Link href="/news" className="text-sm text-blue-400 hover:underline">
              View all news
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  // Create a footer to pass to the layout
  const footer = (
    <Footer />
  );

  return (
    <MainLayout 
      leftSidebar={leftSidebar} 
      rightSidebar={rightSidebar}
      footer={footer}
    >
      {/* Urgent News Ribbon - Only shown if active */}
      {!isLoadingAnnouncement && announcement && announcement.active && (
        <div className="relative my-4 lg:my-6 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white py-3 px-4 rounded-md shadow-lg border border-purple-700">
            {/* Desktop layout (unchanged) - hidden on mobile */}
            <div className="hidden sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-purple-300" />
                <span className="font-semibold">Announcement:</span>
                <span>{announcement.content}</span>
              </div>
              <Link href="/news" className="text-xs bg-purple-800 hover:bg-purple-700 px-2 py-1 rounded-sm transition-colors">
                Learn More
              </Link>
            </div>
            
            {/* Mobile layout - flex column with smaller text and more spacing */}
            <div className="flex flex-col space-y-2 sm:hidden">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-purple-300" />
                <span className="font-semibold text-sm">Announcement:</span>
              </div>
              <div className="text-sm pl-6 pb-2 break-words">{announcement.content}</div>
              <div className="flex justify-end">
                <Link href="/news" className="text-xs bg-purple-800 hover:bg-purple-700 px-2 py-1 rounded-sm transition-colors">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative rounded-lg overflow-hidden mb-8 lg:mb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-indigo-900/80 z-10"></div>
        <div className="absolute inset-0">
          <Image
            src="/nightreign-bg.jpeg"
            alt="Nightreign Background"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative z-20 px-4 py-12 lg:px-6 lg:py-24 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl lg:text-5xl lg:text-6xl font-bold mb-4 lg:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-200">
            Welcome to Covenant Match
          </h1>
          <p className="text-lg lg:text-xl mb-6 lg:mb-8 text-slate-300">
            Find worthy allies, forge unbreakable covenants, and rise through the ranks in Nightreign.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center">
            {!isLoading && (
              <>
                {!isLoggedIn && (
                  <Link href="/profile/create">
                    <Button size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white w-full">
                      <Users className="mr-2 h-5 w-5" />
                      Join Now
                    </Button>
                  </Link>
                )}
                <Link href="/sessions">
                  <Button size="lg" variant="outline" className="border-purple-500 text-purple-300 hover:bg-purple-950/50 w-full">
                    <Compass className="mr-2 h-5 w-5" />
                    Explore Sessions
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Feature Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 my-8 lg:my-12">
        <div className="group bg-gradient-to-br from-background to-purple-950/10 rounded-lg p-4 lg:p-6 border border-purple-900/20 shadow-md transition-all relative overflow-hidden">
          {/* Background effect - always visible, not just on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-indigo-600/10 pointer-events-none"></div>
          
          {/* Content */}
          <div className="flex items-start gap-3 lg:gap-4 relative z-10">
            <div className="bg-purple-900/30 p-2 lg:p-3 rounded-lg">
              <Sword className="h-5 w-5 lg:h-6 lg:w-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl lg:text-2xl font-semibold mb-2">Find Sessions</h2>
              <p className="mb-4 text-sm lg:text-base text-muted-foreground">Join other nightfarer&apos;s looking for allies and begin your hunt immediately.</p>
              <div className="relative z-20">
                <Link href="/sessions">
                  <Button variant="outline" className="border-purple-700/50 bg-purple-950/20 hover:bg-purple-950/30 text-purple-300 w-full sm:w-auto">
                    Browse Sessions
                    <Shield className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="group bg-gradient-to-br from-background to-indigo-950/10 rounded-lg p-4 lg:p-6 border border-indigo-900/20 shadow-md transition-all relative overflow-hidden">
          {/* Background effect - always visible, not just on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-blue-600/10 pointer-events-none"></div>
          
          {/* Content */}
          <div className="flex items-start gap-3 lg:gap-4 relative z-10">
            <div className="bg-indigo-900/30 p-2 lg:p-3 rounded-lg">
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl lg:text-2xl font-semibold mb-2">Create Session</h2>
              <p className="mb-4 text-sm lg:text-base text-muted-foreground">Host a new session and invite fellow nightfarer&apos;s to join your quest.</p>
              <div className="relative z-20">
                {isLoading ? (
                  <Button variant="outline" className="border-indigo-700/50 bg-indigo-950/20 text-indigo-300 w-full sm:w-auto" disabled>
                    <span className="flex items-center justify-center">
                      Loading...
                      <Skull className="ml-2 h-4 w-4 animate-pulse" />
                    </span>
                  </Button>
                ) : isLoggedIn ? (
                  <Link href="/sessions/create">
                    <Button variant="outline" className="border-indigo-700/50 bg-indigo-950/20 hover:bg-indigo-950/30 text-indigo-300 w-full sm:w-auto">
                      Create Session
                      <Skull className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/profile/create">
                    <Button variant="outline" className="border-indigo-700/50 bg-indigo-950/20 hover:bg-indigo-950/30 text-indigo-300 w-full sm:w-auto">
                      Join to Create
                      <Users className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="bg-card/30 border border-accent/20 p-4 lg:p-6 rounded-lg mt-6 lg:mt-8 backdrop-blur-sm">
        <h2 className="text-xl lg:text-2xl font-semibold mb-4 lg:mb-6 pb-2 border-b border-purple-900/20">The Covenant Awaits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <div className="flex items-start gap-3">
            <div className="bg-purple-900/30 p-2 rounded-lg">
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium">Matchmaking</h3>
              <p className="text-sm text-muted-foreground">Find the perfect allies for your Nightreign journey.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-indigo-900/30 p-2 rounded-lg">
              <Sword className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-medium">Automatic IP Detection</h3>
              <p className="text-sm text-muted-foreground">Automatically detect your IP address and match you with the closest players. Important for peer-to-peer sessions.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-900/30 p-2 rounded-lg">
              <Trophy className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium">Track Statistics</h3>
              <p className="text-sm text-muted-foreground">Record your victories and analyze your performance.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-emerald-900/30 p-2 rounded-lg">
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-medium">Build Reputation</h3>
              <p className="text-sm text-muted-foreground">Earn respect through honorable conduct and fair play.</p>
            </div>
          </div>
        </div>
      </div>
      {/* Test the styles if their are not working
      <TestStyled />
      <BasicTest /> */}
    </MainLayout>
  );
}
