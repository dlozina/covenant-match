"use client"

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Session, 
  MinimalSession, 
  fetchSessions,
  NightLord
} from "@/utils/api";

import { SessionService } from "@/utils/api/session-service";
import { fetchNightLords } from "@/utils/api";
import { Notification, NotificationType } from "@/components/ui/notification";

const MAX_PLAYERS = 3;

// Tabs type
type SessionTab = "general" | "friends";

// Add maxPlayers to the Session type
// interface ExtendedSession extends Session {
//   maxPlayers: number;
// }

export default function SessionsPage() {
  const router = useRouter();
  const { isLoggedIn, userData, isLoading: isUserLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [friendsSessions, setFriendsSessions] = useState<Session[]>([]);
  const [minimalSessions, setMinimalSessions] = useState<MinimalSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [friendsCurrentPage, setFriendsCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [friendsTotalPages, setFriendsTotalPages] = useState(1);
  const [nightLordFilter, setNightLordFilter] = useState<string>("All");
  const [nightLords, setNightLords] = useState<NightLord[]>([]);
  const [isLoadingNightLords, setIsLoadingNightLords] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [activeTab, setActiveTab] = useState<SessionTab>("general");
  const limit = 10;
  
  // Get user region and platform data for API calls
  const userRegion = userData?.autoRegion ? userData.cmRegion : userData?.region;
  const userPlatform = userData?.platform;

  // Check for kick notification
  useEffect(() => {
    const wasPlayerKicked = sessionStorage.getItem('playerKicked');
    if (wasPlayerKicked === 'true') {
      // Get details if available
      const hostUsername = sessionStorage.getItem('kickedByHost') || 'Host';
      const kickTimestamp = sessionStorage.getItem('kickTimestamp');
      
      // Only show notification if it was stored recently (within the last 30 seconds)
      const now = Date.now();
      const isRecentKick = kickTimestamp && 
                           (now - parseInt(kickTimestamp, 10)) < 30000;
      
      if (isRecentKick) {
        setNotification({
          message: `You were kicked from the session by ${hostUsername}`,
          type: "warning"
        });
        
        // Clear the notification after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
      
      // Clear kick data
      sessionStorage.removeItem('playerKicked');
      sessionStorage.removeItem('kickedByHost');
      sessionStorage.removeItem('kickedSessionId');
      sessionStorage.removeItem('kickTimestamp');
    }
  }, []);
  
  // Function to dismiss notification
  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Fetch Night Lords on component mount
  useEffect(() => {
    const loadNightLords = async () => {
      try {
        setIsLoadingNightLords(true);
        const lords = await fetchNightLords();
        setNightLords(lords);
      } catch (error) {
        console.error("Error fetching Night Lords:", error);
      } finally {
        setIsLoadingNightLords(false);
      }
    };
    
    loadNightLords();
  }, []);

  // Wait initially before first fetch to ensure userData is loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldFetch(true);
    }, 100); // 100ms delay to ensure userData is loaded
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch general sessions data
  const fetchGeneralSessions = useCallback(async () => {
    if (!shouldFetch) return;
    if (isLoggedIn && isUserLoading) return; // Wait for user data if logged in
    
    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching general sessions with region:", userRegion, 
                 "platform:", userPlatform,
                 "nightLordFilter:", nightLordFilter);
      
      // Fetch all sessions with Open status
      const result = await fetchSessions(
        isLoggedIn, 
        currentPage, 
        limit, 
        "Open", // Only show Open sessions
        userRegion,
        userPlatform
      );
      
      if (result.sessions) {

        setSessions(result.sessions);
        
        // Apply Night Lord filter if it's set
        if (nightLordFilter !== 'All') {
          setFilteredSessions(result.sessions.filter(session => 
            session.nightLord.toLowerCase() === nightLordFilter.toLowerCase()
          ));
        } else {
          setFilteredSessions(result.sessions);
        }
        
        setTotalPages(result.sessions.length === limit ? currentPage + 1 : currentPage);
      } else if (result.minimalSessions) {
        setMinimalSessions(result.minimalSessions);
        setTotalPages(result.minimalSessions.length === limit ? currentPage + 1 : currentPage);
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, currentPage, limit, userRegion, userPlatform, isUserLoading, shouldFetch, nightLordFilter]);

  // Fetch friends sessions data
  const fetchFriendsSessions = useCallback(async () => {
    if (!shouldFetch || !isLoggedIn) return;
    if (isUserLoading) return; // Wait for user data
    
    setIsLoadingFriends(true);
    setError(null);

    try {
      // Fetch sessions created by friends
      const offset = (friendsCurrentPage - 1) * limit;
      
      const sessions = await SessionService.getFriendSessions({
        status: "Open", // Only show Open sessions
        limit,
        offset,
        region: userRegion,
        platform: userPlatform
      });

      setFriendsSessions(sessions);
      
      setFriendsTotalPages(sessions.length === limit ? friendsCurrentPage + 1 : friendsCurrentPage);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load friend sessions");
    } finally {
      setIsLoadingFriends(false);
    }
  }, [isLoggedIn, friendsCurrentPage, limit, userRegion, userPlatform, isUserLoading, shouldFetch]);
  
  // Effect for fetching general sessions
  useEffect(() => {
    if (activeTab === "general" || !isLoggedIn) {
      fetchGeneralSessions();
    }
  }, [currentPage, activeTab, shouldFetch, fetchGeneralSessions]);
  
  // Effect for fetching friends sessions
  useEffect(() => {
    if (activeTab === "friends" && isLoggedIn) {
      fetchFriendsSessions();
    }
  }, [friendsCurrentPage, activeTab, shouldFetch, fetchFriendsSessions, isLoggedIn]);
  
  // Additional effect to handle client-side filtering for nightLord in general tab
  useEffect(() => {
    if (sessions.length > 0 && nightLordFilter !== 'All') {
      setFilteredSessions(sessions.filter(session => 
        session.nightLord.toLowerCase() === nightLordFilter.toLowerCase()
      ));
    } else if (sessions.length > 0) {
      setFilteredSessions(sessions);
    }
  }, [nightLordFilter, sessions]);
  
  // Handler for refresh button
  const handleRefresh = () => {
    if (activeTab === "general") {
      if (!isLoading) {
        fetchGeneralSessions();
      }
    } else if (activeTab === "friends" && isLoggedIn) {
      if (!isLoadingFriends) {
        fetchFriendsSessions();
      }
    }
  };

  // Night Lord filter change handler
  const handleNightLordFilterChange = (value: string) => {
    setNightLordFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes

    // Apply filter locally if we have session data
    if (sessions.length > 0) {
      if (value === "All") {
        setFilteredSessions(sessions);
      } else {
        setFilteredSessions(sessions.filter(session => 
          session.nightLord.toLowerCase() === value.toLowerCase()
        ));
      }
    }
  };

  // Handle tab change
  const handleTabChange = (value: SessionTab) => {
    setActiveTab(value);
    // Load friends sessions when switching to friends tab if not already loaded
    if (value === "friends" && isLoggedIn && friendsSessions.length === 0) {
      fetchFriendsSessions();
    }
  };

  async function handleJoinSession(sessionId: string) {
    // Require authentication to join a session
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    try {
      // Get the session based on active tab
      const currentSessions = activeTab === "general" ? filteredSessions : friendsSessions;
      const session = currentSessions.find(s => s.id === sessionId);
      
      if (!session || session.status !== 'Open') {
        return;
      }

      // Navigate to the join page with the session ID
      router.push(`/sessions/join?id=${sessionId}`);
    } catch (error: unknown) {
      console.error(error);
    }
  }

  function getHostName(session: Session) {
    const host = session.joinedPlayers.find(player => player.userId === session.hostId);
    return host ? host.username : 'Unknown';
  }

  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-6 md:py-10 px-4 sm:px-6 md:px-8 mx-auto bg-gradient-to-b from-background to-background/95">
        {/* Notification component */}
        {notification && (
          <Notification 
            notification={notification}
            onDismiss={dismissNotification}
            className="mb-4"
          />
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gradient bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-400">
              Game Sessions Hub
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Join a session or create your own to battle alongside fellow Nightreign warriors
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto order-2 sm:order-1 border-purple-600/40"
              onClick={handleRefresh}
              disabled={isLoading || isLoadingFriends}
            >
              {(isLoading || isLoadingFriends) ? "Refreshing..." : "Refresh"}
            </Button>
            <Button 
              className="w-full sm:w-auto order-1 sm:order-2 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600" 
              asChild
            >
              <Link href={isLoggedIn ? "/sessions/create" : "/login?redirect=/sessions/create"}>Create Session</Link>
            </Button>
          </div>
        </div>
        
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden mb-8">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => handleTabChange(value as SessionTab)}
            className="w-full"
          >
            <div className="border-b px-5 py-3 bg-muted/30">
              <TabsList className="grid w-full grid-cols-2 bg-muted/60">
                <TabsTrigger value="general" className="text-base font-medium">
                  All Sessions
                </TabsTrigger>
                <TabsTrigger 
                  value="friends" 
                  className="text-base font-medium"
                  disabled={!isLoggedIn}
                >
                  Friends&apos; Sessions
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* General Sessions Tab */}
            <TabsContent value="general" className="p-0">
              <div className="p-4 border-b bg-muted/10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h3 className="text-base font-medium">Filter by Night Lord</h3>
                  <div className="w-full max-w-xs">
                    <Select
                      value={nightLordFilter}
                      onValueChange={(value) => handleNightLordFilterChange(value)}
                      disabled={isLoadingNightLords}
                    >
                      <SelectTrigger className="h-9 bg-background">
                        <SelectValue placeholder="Select Night Lord" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Night Lords</SelectItem>
                        {nightLords.map(lord => (
                          <SelectItem key={lord.id} value={lord.name}>{lord.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {isUserLoading && isLoggedIn && (
                <div className="flex justify-center items-center my-6 py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading user data...</p>
                  </div>
                </div>
              )}
              
              {isLoading ? (
                <div className="flex flex-col justify-center items-center py-16">
                  <div className="animate-pulse flex space-x-2 mb-4">
                    <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
                    <div className="h-3 w-3 bg-indigo-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
                  </div>
                  <p className="text-muted-foreground">Loading available sessions...</p>
                </div>
              ) : error ? (
                <div className="p-4 m-4 border rounded-lg bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                  <p>{error}</p>
                </div>
              ) : filteredSessions.length === 0 && minimalSessions.length === 0 ? (
                <div className="p-6 flex flex-col items-center justify-center">
                  <div className="text-center mb-4">
                    <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="text-lg font-medium">No open sessions found</h3>
                    <p className="text-muted-foreground mt-1">Try a different filter or create your own session</p>
                  </div>
                  <Button 
                    className="mt-2 bg-gradient-to-r from-purple-600 to-indigo-500" 
                    asChild
                  >
                    <Link href={isLoggedIn ? "/sessions/create" : "/login?redirect=/sessions/create"}>
                      Create New Session
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop view - Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/30">
                          <TableHead className="w-[250px] font-semibold">Session Name</TableHead>
                          <TableHead className="font-semibold">Host</TableHead>
                          <TableHead className="font-semibold">Night Lord</TableHead>
                          <TableHead className="font-semibold">Players</TableHead>
                          {isLoggedIn && <TableHead className="text-right font-semibold">Action</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoggedIn ? (
                          // Full data display for authenticated users
                          filteredSessions.map((session) => (
                            <TableRow key={session.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell className="font-medium">{session.name}</TableCell>
                              <TableCell>{getHostName(session)}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                  {session.nightLord}
                                </span>
                              </TableCell>
                              <TableCell>
                                {session.joinedPlayers.length}/{3}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                                  onClick={() => handleJoinSession(session.id)}
                                >
                                  Join Game
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          // Minimal data display for non-authenticated users
                          minimalSessions.map((session) => (
                            <TableRow key={session.id} className="hover:bg-muted/10 transition-colors">
                              <TableCell className="font-medium">{session.name}</TableCell>
                              <TableCell>{session.hostName}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                  {(session as { nightLord?: string }).nightLord || '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {(session as { playerCount?: number }).playerCount || 1}/{MAX_PLAYERS}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  className="border-purple-600/40"
                                  asChild
                                >
                                  <Link href="/login">Login to Join</Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile view - Cards */}
                  <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                    {isLoggedIn ? (
                      // Full data display for authenticated users
                      filteredSessions.map((session) => (
                        <div key={session.id} className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow hover:border-purple-500/30">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-base truncate">{session.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                              {session.nightLord}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            <div className="flex justify-between">
                              <p>Host: {getHostName(session)}</p>
                              <p>Players: {session.joinedPlayers.length}/{MAX_PLAYERS}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Button 
                              size="sm"
                              className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                              onClick={() => handleJoinSession(session.id)}
                            >
                              Join Game
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Minimal data display for non-authenticated users
                      minimalSessions.map((session) => (
                        <div key={session.id} className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow hover:border-purple-500/30">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-base truncate">{session.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                              {(session as { nightLord?: string }).nightLord || '-'}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            <div className="flex justify-between">
                              <p>Host: {session.hostName}</p>
                              <p>Players: {(session as { playerCount?: number }).playerCount || 1}/{MAX_PLAYERS}</p>
                            </div>
                          </div>
                          <div className="mt-3 text-center">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full border-purple-600/40"
                              asChild
                            >
                              <Link href="/login">Login to Join</Link>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            size="default"
                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        
                        {/* Hide page numbers on small screens */}
                        <div className="hidden sm:flex">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink 
                                href="#" 
                                size="default"
                                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                                  e.preventDefault();
                                  setCurrentPage(page);
                                }}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                        </div>
                        
                        {/* Show current page indicator on mobile */}
                        <div className="flex sm:hidden items-center px-2">
                          <span className="text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                        </div>
                        
                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            size="default"
                            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </>
              )}
            </TabsContent>
            
            {/* Friends Sessions Tab */}
            <TabsContent value="friends" className="p-0">
              {!isLoggedIn ? (
                <div className="p-6 text-center">
                  <div className="inline-block p-3 rounded-full bg-muted mb-4">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Login Required</h3>
                  <p className="text-muted-foreground mb-4">You need to log in to see your friends&apos; sessions</p>
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-500" asChild>
                    <Link href="/login">Login Now</Link>
                  </Button>
                </div>
              ) : isLoadingFriends ? (
                <div className="flex flex-col justify-center items-center py-16">
                  <div className="animate-pulse flex space-x-2 mb-4">
                    <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
                    <div className="h-3 w-3 bg-indigo-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-purple-600 rounded-full"></div>
                  </div>
                  <p className="text-muted-foreground">Loading friends&apos; sessions...</p>
                </div>
              ) : error ? (
                <div className="p-4 m-4 border rounded-lg bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                  <p>{error}</p>
                </div>
              ) : friendsSessions.length === 0 ? (
                <div className="p-6 flex flex-col items-center justify-center">
                  <div className="text-center mb-4">
                    <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-medium">No friend sessions</h3>
                    <p className="text-muted-foreground mt-1">None of your friends have created open sessions</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      className="border-purple-600/40"
                      asChild
                    >
                      <Link href="/friends">Find Friends</Link>
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-purple-600 to-indigo-500" 
                      asChild
                    >
                      <Link href="/sessions/create">Create New Session</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop view - Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/30">
                          <TableHead className="w-[250px] font-semibold">Session Name</TableHead>
                          <TableHead className="font-semibold">Friend</TableHead>
                          <TableHead className="font-semibold">Night Lord</TableHead>
                          <TableHead className="font-semibold">Players</TableHead>
                          <TableHead className="text-right font-semibold">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {friendsSessions.map((session) => (
                          <TableRow key={session.id} className="hover:bg-muted/10 transition-colors">
                            <TableCell className="font-medium">{session.name}</TableCell>
                            <TableCell>{getHostName(session)}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                {session.nightLord}
                              </span>
                            </TableCell>
                            <TableCell>
                              {session.joinedPlayers.length}/{MAX_PLAYERS}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm"
                                className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                                onClick={() => handleJoinSession(session.id)}
                              >
                                Join Friend
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile view - Cards */}
                  <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                    {friendsSessions.map((session) => (
                      <div key={session.id} className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow hover:border-purple-500/30">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-base truncate">{session.name}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {session.nightLord}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          <div className="flex justify-between">
                            <p>Friend: {getHostName(session)}</p>
                            <p>Players: {session.joinedPlayers.length}/{MAX_PLAYERS}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Button 
                            size="sm"
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                            onClick={() => handleJoinSession(session.id)}
                          >
                            Join Friend
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {friendsSessions.length > 0 && (
                    <div className="p-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#" 
                              size="default"
                              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                                e.preventDefault();
                                if (friendsCurrentPage > 1) setFriendsCurrentPage(friendsCurrentPage - 1);
                              }}
                              className={friendsCurrentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          
                          {/* Hide page numbers on small screens */}
                          <div className="hidden sm:flex">
                            {Array.from({ length: friendsTotalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink 
                                  href="#" 
                                  size="default"
                                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                                    e.preventDefault();
                                    setFriendsCurrentPage(page);
                                  }}
                                  isActive={friendsCurrentPage === page}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                          </div>
                          
                          {/* Show current page indicator on mobile */}
                          <div className="flex sm:hidden items-center px-2">
                            <span className="text-sm">
                              Page {friendsCurrentPage} of {friendsTotalPages}
                            </span>
                          </div>
                          
                          <PaginationItem>
                            <PaginationNext 
                              href="#" 
                              size="default"
                              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                                e.preventDefault();
                                if (friendsCurrentPage < friendsTotalPages) setFriendsCurrentPage(friendsCurrentPage + 1);
                              }}
                              className={friendsCurrentPage >= friendsTotalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
