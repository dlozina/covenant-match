"use client"

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
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
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Notification, NotificationType } from "@/components/ui/notification";
import { FALLBACK_EXPERIENCE } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { saveRedirectUrl } from "@/utils/auth-redirect";

// Import types from API
import {
  Session, 
  MinimalSession, 
  NightLord
} from "@/utils/api/types";

// Import services and utils
import { fetchNightLords } from "@/utils/api";
import { SessionService } from "@/utils/api/session-service";

const MAX_PLAYERS = 3;

// Create a new array with "All" as the first option followed by the experience levels from FALLBACK_EXPERIENCE
const EXPERIENCE_OPTIONS = ["All", ...FALLBACK_EXPERIENCE];

// Tabs type
type SessionTab = "general" | "friends";

// Update the JoinedPlayer interface to include experience
interface ExtendedJoinedPlayer {
  userId: string;
  username: string;
  nightfarer: string;
  joinedAt: string;
  experience?: string;
}

// Use the updated interface in the Session interface
interface ExtendedSession extends Omit<Session, 'joinedPlayers'> {
  joinedPlayers: ExtendedJoinedPlayer[];
}

// Fix the MinimalSession type to ensure properly extended with required data
interface ExtendedMinimalSession extends MinimalSession {
  joinedPlayers: {
    userId: string;
    username: string;
    nightfarer: string;
    experience?: string;
  }[];
  hostExperience?: string;
  playerCount?: number;
}

export default function SessionsPage() {
  const router = useRouter();
  const { isLoggedIn, userData, isLoading: isUserLoading } = useAuth();
  const [sessions, setSessions] = useState<ExtendedSession[]>([]);
  const [friendsSessions, setFriendsSessions] = useState<ExtendedSession[]>([]);
  const [minimalSessions, setMinimalSessions] = useState<ExtendedMinimalSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [friendsCurrentPage, setFriendsCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [friendsTotalPages, setFriendsTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [friendsTotalItems, setFriendsTotalItems] = useState(0);
  const [nightLordFilter, setNightLordFilter] = useState<string>("All");
  const [friendsNightLordFilter, setFriendsNightLordFilter] = useState<string>("All");
  const [experienceFilter, setExperienceFilter] = useState<string>("All");
  const [friendsExperienceFilter, setFriendsExperienceFilter] = useState<string>("All");
  const [nightLords, setNightLords] = useState<NightLord[]>([]);
  const [isLoadingNightLords, setIsLoadingNightLords] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [activeTab, setActiveTab] = useState<SessionTab>("general");
  const pageSize = 10; // Fixed page size
  const friendsPageSize = 10; // Fixed page size for friends tab
  
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

  // Fetch friends sessions data (updated for SessionService direct call)
  const fetchFriendsSessions = useCallback(async () => {
    if (!shouldFetch || !isLoggedIn) return;
    if (isUserLoading) return; // Wait for user data
    
    setIsLoadingFriends(true);
    setError(null);

    try {
      // Use SessionService directly since fetchFriendSessions is not exported
      const response = await SessionService.getFriendSessions({
        status: "Open", // Only show Open sessions
        limit: friendsPageSize,
        isPrivate: false,
        offset: (friendsCurrentPage - 1) * friendsPageSize,
        region: userRegion,
        platform: userPlatform,
        nightLord: friendsNightLordFilter !== 'All' ? friendsNightLordFilter : undefined,
        hostExperience: friendsExperienceFilter !== 'All' ? friendsExperienceFilter : undefined
      });

      // Cast the response data to our extended interface
      setFriendsSessions(response.items as unknown as ExtendedSession[]);
      setFriendsTotalPages(response.metadata.pageCount);
      setFriendsTotalItems(response.metadata.totalCount);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load friend sessions");
    } finally {
      setIsLoadingFriends(false);
    }
  }, [
    isLoggedIn, 
    friendsCurrentPage, 
    friendsPageSize, 
    userRegion, 
    userPlatform, 
    isUserLoading, 
    shouldFetch,
    friendsNightLordFilter,
    friendsExperienceFilter
  ]);

  // Update the fetchGeneralSessions function
  const fetchGeneralSessions = useCallback(async () => {
    if (!shouldFetch) return;
    if (isLoggedIn && isUserLoading) return; // Wait for user data if logged in
    
    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching general sessions with region:", userRegion, 
                 "platform:", userPlatform,
                 "nightLordFilter:", nightLordFilter,
                 "experienceFilter:", experienceFilter);
      
      // Use the SessionService directly with updated params
      if (isLoggedIn) {
        const response = await SessionService.getSessions({
          status: "Open",
          limit: pageSize,
          isPrivate: false,
          offset: (currentPage - 1) * pageSize,
          region: userRegion,
          platform: userPlatform,
          nightLord: nightLordFilter !== 'All' ? nightLordFilter : undefined,
          hostExperience: experienceFilter !== 'All' ? experienceFilter : undefined
        });

        // Cast the response data to our extended interface
        setSessions(response.items as unknown as ExtendedSession[]);
        setTotalPages(Math.max(1, response.metadata.pageCount));
        setTotalItems(response.metadata.totalCount);
      } else {
        // For non-authenticated users, don't filter by region or platform - show all available sessions
        const response = await SessionService.getPublicSessions({
          status: "Open",
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          // Only apply Night Lord and host experience filters
          nightLord: nightLordFilter !== 'All' ? nightLordFilter : undefined,
          hostExperience: experienceFilter !== 'All' ? experienceFilter : undefined
        });

        // Cast the response data to our extended interface
        setMinimalSessions(response.items as unknown as ExtendedMinimalSession[]);
        // Ensure totalPages is at least 1 to prevent UI issues
        setTotalPages(Math.max(1, response.metadata.pageCount));
        setTotalItems(response.metadata.totalCount);
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load sessions");
      // Set default values on error to prevent UI issues
      if (!isLoggedIn) {
        setMinimalSessions([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoggedIn, 
    currentPage, 
    pageSize, 
    userRegion, 
    userPlatform, 
    isUserLoading, 
    shouldFetch, 
    nightLordFilter, 
    experienceFilter
  ]);

  // Effect for fetching general sessions
  useEffect(() => {
    if (activeTab === "general" || !isLoggedIn) {
      fetchGeneralSessions();
    }
  }, [currentPage, pageSize, activeTab, shouldFetch, fetchGeneralSessions, nightLordFilter, experienceFilter]);
  
  // Effect for fetching friends sessions
  useEffect(() => {
    if (activeTab === "friends" && isLoggedIn) {
      fetchFriendsSessions();
    }
  }, [friendsCurrentPage, friendsPageSize, activeTab, shouldFetch, fetchFriendsSessions, isLoggedIn, friendsNightLordFilter, friendsExperienceFilter]);

  // Night Lord filter change handler for general tab
  const handleNightLordFilterChange = (value: string) => {
    setNightLordFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Experience filter change handler for general tab
  const handleExperienceFilterChange = (value: string) => {
    setExperienceFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Night Lord filter change handler for friends tab
  const handleFriendsNightLordFilterChange = (value: string) => {
    setFriendsNightLordFilter(value);
    setFriendsCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Experience filter change handler for friends tab
  const handleFriendsExperienceFilterChange = (value: string) => {
    setFriendsExperienceFilter(value);
    setFriendsCurrentPage(1); // Reset to first page when filter changes
  };

  // Handle tab change
  const handleTabChange = (value: SessionTab) => {
    setActiveTab(value);
    
    // Load friends sessions when switching to friends tab
    if (value === "friends" && isLoggedIn) {
      // Always make sure we have fresh data when switching to friends tab
      fetchFriendsSessions();
      
      // Only reset experience filter, keep nightLord filter
      setFriendsExperienceFilter("All");
    } else if (value === "general") {
      // Only reset experience filter, keep nightLord filter
      setExperienceFilter("All");
      
      // Refresh general sessions if needed
      if (sessions.length === 0) {
        fetchGeneralSessions();
      }
    }
  };

  async function handleJoinSession(sessionId: string) {
    // Require authentication to join a session
    if (!isLoggedIn) {
      // Save the URL to redirect to after login
      const joinUrl = `/sessions/join?id=${sessionId}`;
      saveRedirectUrl(joinUrl);
      router.push('/login');
      return;
    }

    try {
      // Get the session based on active tab
      const currentSessions = activeTab === "general" ? sessions : friendsSessions;
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

  // Add handler for login to join buttons
  const handleLoginToJoin = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const joinUrl = `/sessions/join?id=${sessionId}`;
    saveRedirectUrl(joinUrl);
    router.push('/login');
  };

  // Update the session card component with host experience
  const SessionCard = ({ 
    session, 
    onJoin,
    isLoginAction = false,
  }: { 
    session: ExtendedSession | ExtendedMinimalSession; 
    onJoin: (id: string) => void;
    isLoginAction?: boolean;
  }) => {
    const isFullSession = 'joinedPlayers' in session && Array.isArray(session.joinedPlayers) 
      ? session.joinedPlayers.length >= MAX_PLAYERS
      : false;
    
    // Calculate player count
    const playerCount = 'playerCount' in session 
      ? session.playerCount 
      : ('joinedPlayers' in session && Array.isArray(session.joinedPlayers)) 
          ? session.joinedPlayers.length 
          : 0;
    
    // Extract host info
    const hostName = 'hostName' in session 
      ? session.hostName 
      : getHostName(session as ExtendedSession);
      
    // Extract host experience
    const hostExperience = 'hostExperience' in session 
      ? session.hostExperience 
      : ('joinedPlayers' in session && 'hostId' in session && Array.isArray(session.joinedPlayers))
        ? session.joinedPlayers.find(p => p.userId === session.hostId)?.experience
        : undefined;
    
    return (
      <div className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{session.name}</h3>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
              {session.nightLord || '-'}
            </span>
            {'isFriendsOnly' in session && session.isFriendsOnly && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                Friends Only
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div>
            <span className="text-muted-foreground">Host:</span> {hostName}
          </div>
          <div className="flex justify-end">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {hostExperience || "Unknown"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span> {session.status}
          </div>
          <div className="flex justify-end">
            <span className="text-muted-foreground">Players:</span> {playerCount}/{MAX_PLAYERS}
          </div>
        </div>
        
        {isLoginAction ? (
          <Button 
            className="w-full border-purple-600/40"
            variant="outline"
            size="sm"
            onClick={() => onJoin(session.id)}
            disabled={isFullSession}
          >
            {isFullSession ? "Session Full" : "Login to Join"}
          </Button>
        ) : (
          <Button 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
            size="sm"
            onClick={() => onJoin(session.id)}
            disabled={isFullSession}
          >
            {isFullSession ? "Session Full" : "Join Session"}
          </Button>
        )}
      </div>
    );
  };

  function getVisiblePageNumbers(currentPage: number, totalPages: number): (number | null)[] {
    // For small number of pages, show all pages
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const result: (number | null)[] = [];
    
    // Always include page 1
    result.push(1);
    
    // For current pages near the beginning
    if (currentPage <= 3) {
      result.push(2, 3, 4);
      result.push(null); // Ellipsis
      result.push(totalPages - 1, totalPages);
    } 
    // For current pages near the end
    else if (currentPage >= totalPages - 2) {
      result.push(null); // Ellipsis
      result.push(totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } 
    // For current pages in the middle
    else {
      result.push(null); // Ellipsis before current
      result.push(currentPage - 1, currentPage, currentPage + 1);
      result.push(null); // Ellipsis after current
      result.push(totalPages);
    }
    
    // Remove any duplicate values and nulls that are consecutive
    return result.filter((value, index, self) => 
      // Remove duplicate values
      self.indexOf(value) === index ||
      // Keep consecutive nulls as single instance
      (value === null && self[index - 1] !== null)
    );
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
            Majula - Game Sessions Hub
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Join a session or create your own to battle alongside fellow Nightreign warriors
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto order-2 sm:order-1 border-purple-600/40"
              onClick={fetchGeneralSessions}
              disabled={isLoading || isLoadingFriends}
            >
              {(isLoading || isLoadingFriends) ? "Refreshing..." : "Refresh"}
            </Button>
            <Button 
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600" 
              asChild
            >
              <Link href={isLoggedIn ? "/sessions/create" : "/login?redirect=/sessions/create"}>Create Session</Link>
            </Button>
          </div>
        </div>
        
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden mb-8">
          {/* Filters */}
          <div className="p-4 flex flex-wrap gap-4 items-center justify-between bg-background shadow-sm rounded-lg mb-4">
            <div className="flex flex-wrap gap-4">
              {/* Night Lord filter */}
              <div>
                <Select
                  value={activeTab === "general" ? nightLordFilter : friendsNightLordFilter}
                  onValueChange={
                    activeTab === "general" 
                      ? handleNightLordFilterChange 
                      : handleFriendsNightLordFilterChange
                  }
                  disabled={isLoadingNightLords}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Night Lord" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Night Lords</SelectItem>
                    {nightLords.map((lord) => (
                      <SelectItem key={lord.id} value={lord.name}>
                        {lord.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Experience filter */}
              <div>
                <Select
                  value={activeTab === "general" ? experienceFilter : friendsExperienceFilter}
                  onValueChange={
                    activeTab === "general" 
                      ? handleExperienceFilterChange 
                      : handleFriendsExperienceFilterChange
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Host Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((exp) => (
                      <SelectItem key={exp} value={exp}>
                        {exp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Mobile Dropdown Selector - Hidden on Desktop */}
          <div className="border-b px-5 py-3 bg-muted/30 md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {activeTab === "general" ? "All Sessions" : "Friends' Sessions"}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                <DropdownMenuItem 
                  onClick={() => handleTabChange("general")}
                  className={activeTab === "general" ? "bg-muted/50" : ""}
                >
                  All Sessions
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleTabChange("friends")}
                  className={`${activeTab === "friends" ? "bg-muted/50" : ""} ${!isLoggedIn ? "opacity-50 pointer-events-none" : ""}`}
                >
                  Friends&apos; Sessions
                  <span className="ml-2 bg-purple-500/20 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-1.5 py-0.5 rounded-full">Friends</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Tabs - Hidden on Mobile */}
          <div className="border-b px-5 py-3 bg-muted/30 hidden md:block">
            <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as SessionTab)}>
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
                  <span className="ml-2 bg-purple-500/20 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">Friends Only</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Display content based on active tab */}
          {activeTab === "general" && (
            <div className="p-0">
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
              ) : sessions.length === 0 && minimalSessions.length === 0 ? (
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
                          <TableHead className="font-semibold">Experience</TableHead>
                          <TableHead className="font-semibold">Players</TableHead>
                          {isLoggedIn && <TableHead className="text-right font-semibold">Action</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoggedIn ? (
                          // Full data display for authenticated users
                          sessions.map((session) => {
                            const host = session.joinedPlayers.find(player => player.userId === session.hostId);
                            const isFullSession = session.joinedPlayers.length >= MAX_PLAYERS;
                            return (
                              <TableRow key={session.id} className="hover:bg-muted/10 transition-colors">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isFullSession ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                    {session.name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{getHostName(session)}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                      {session.nightLord}
                                    </span>
                                    {session.isFriendsOnly && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                        Friends
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                    {host?.experience || "Unknown"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                      <div className="bg-gradient-to-r from-purple-600 to-indigo-500 h-2.5 rounded-full" style={{ width: `${(session.joinedPlayers.length / MAX_PLAYERS) * 100}%` }}></div>
                                    </div>
                                    <span className="text-xs ml-2">{session.joinedPlayers.length}/{MAX_PLAYERS}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm"
                                    className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                                    onClick={() => handleJoinSession(session.id)}
                                    disabled={isFullSession}
                                  >
                                    {isFullSession ? "Full" : "Join Game"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          // Minimal data display for non-authenticated users
                          minimalSessions.map((session) => {
                            const isFullSession = session.playerCount ? session.playerCount >= MAX_PLAYERS : false;
                            return (
                              <TableRow key={session.id} className="hover:bg-muted/10 transition-colors">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isFullSession ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                    {session.name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{session.hostName}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                    {session.nightLord || '-'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                    {session.hostExperience || "Unknown"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                      <div className="bg-gradient-to-r from-purple-600 to-indigo-500 h-2.5 rounded-full" style={{ width: `${((session.playerCount || 1) / MAX_PLAYERS) * 100}%` }}></div>
                                    </div>
                                    <span className="text-xs ml-2">{session.playerCount || 1}/{MAX_PLAYERS}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    className="border-purple-600/40"
                                    asChild
                                    disabled={isFullSession}
                                  >
                                    <Link href="/login" onClick={(e) => handleLoginToJoin(session.id, e)}>
                                      {isFullSession ? "Session Full" : "Login to Join"}
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile view - Cards */}
                  <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                    {isLoggedIn ? (
                      // Full data display for authenticated users
                      sessions.map((session) => {
                        return (
                          <SessionCard key={session.id} session={session} onJoin={handleJoinSession} />
                        );
                      })
                    ) : (
                      // Minimal data display for non-authenticated users
                      minimalSessions.map((session) => (
                        <SessionCard 
                          key={session.id} 
                          session={session} 
                          onJoin={handleLoginToJoin}
                          isLoginAction={true}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
              
              {/* Show pagination if not loading and sessions data is available */}
              {!isLoading && (
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
                        {getVisiblePageNumbers(currentPage, totalPages).map((page, index) => {
                          // If the value is null, render ellipsis
                          if (page === null) {
                            return (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <span className="px-4 text-gray-500">...</span>
                              </PaginationItem>
                            );
                          }
                          
                          // Otherwise render the page number button
                          return (
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
                          );
                        })}
                      </div>
                      
                      {/* Show current page indicator on mobile */}
                      <div className="flex sm:hidden items-center px-2">
                        <span className="text-sm">
                          Page {currentPage} of {totalPages} ({totalItems} sessions)
                        </span>
                      </div>
                      
                      {/* Show total items on desktop */}
                      <div className="hidden sm:flex items-center px-2 text-sm text-muted-foreground">
                        {totalItems} total sessions
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
              )}
            </div>
          )}
          
          {activeTab === "friends" && (
            <div className="p-0">
              {/* Explanation banner for friend sessions */}
              <div className="p-4 border-b bg-purple-50 dark:bg-purple-900/10">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  This tab shows sessions created by your friends that are marked as &ldquo;Friends Only&rdquo;. These sessions are exclusive and not visible in the regular sessions list.
                </p>
              </div>
              
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
                      className="bg-gradient-to-r from-purple-600 to-indigo-500" 
                      asChild
                    >
                      <Link href="/sessions/create">Create New Session</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Friends tab table view */}
                  {activeTab === "friends" && (
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20 hover:bg-muted/30">
                            <TableHead className="w-[250px] font-semibold">Session Name</TableHead>
                            <TableHead className="font-semibold">Friend</TableHead>
                            <TableHead className="font-semibold">Night Lord</TableHead>
                            <TableHead className="font-semibold">Experience</TableHead>
                            <TableHead className="font-semibold">Players</TableHead>
                            <TableHead className="text-right font-semibold">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {friendsSessions.map((session) => {
                            const host = session.joinedPlayers.find(player => player.userId === session.hostId);
                            const isFullSession = session.joinedPlayers.length >= MAX_PLAYERS;
                            return (
                              <TableRow key={session.id} className="hover:bg-muted/10 transition-colors">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isFullSession ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                    {session.name}
                                     {session.isFriendsOnly && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                        Friends
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{getHostName(session)}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                      {session.nightLord}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                    {host?.experience || "Unknown"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                      <div className="bg-gradient-to-r from-purple-600 to-indigo-500 h-2.5 rounded-full" style={{ width: `${(session.joinedPlayers.length / MAX_PLAYERS) * 100}%` }}></div>
                                    </div>
                                    <span className="text-xs ml-2">{session.joinedPlayers.length}/{MAX_PLAYERS}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm"
                                    className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
                                    onClick={() => handleJoinSession(session.id)}
                                    disabled={isFullSession}
                                  >
                                    {isFullSession ? "Full" : "Join Friend"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Mobile view - Cards */}
                  <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                    {friendsSessions.map((session) => {
                      return (
                        <SessionCard key={session.id} session={session} onJoin={handleJoinSession} />
                      );
                    })}
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
                            {getVisiblePageNumbers(friendsCurrentPage, friendsTotalPages).map((page, index) => {
                              // If the value is null, render ellipsis
                              if (page === null) {
                                return (
                                  <PaginationItem key={`ellipsis-${index}`}>
                                    <span className="px-4 text-gray-500">...</span>
                                  </PaginationItem>
                                );
                              }
                              
                              // Otherwise render the page number button
                              return (
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
                              );
                            })}
                          </div>
                          
                          {/* Show current page indicator on mobile */}
                          <div className="flex sm:hidden items-center px-2">
                            <span className="text-sm">
                              Page {friendsCurrentPage} of {friendsTotalPages} ({friendsTotalItems} sessions)
                            </span>
                          </div>
                          
                          {/* Show total items on desktop */}
                          <div className="hidden sm:flex items-center px-2 text-sm text-muted-foreground">
                            {friendsTotalItems} total friends&apos; sessions
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
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
