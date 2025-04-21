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
  Session, 
  MinimalSession, 
  fetchSessions
} from "@/utils/api";

type StatusFilter = "All" | "Open" | "InProgress" | "Completed";
type FriendFilter = "All" | "Friends";

export default function SessionsPage() {
  const router = useRouter();
  const { isLoggedIn, userData, isLoading: isUserLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [minimalSessions, setMinimalSessions] = useState<MinimalSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Open");
  const [friendFilter, setFriendFilter] = useState<FriendFilter>("All");
  const [shouldFetch, setShouldFetch] = useState(false); // Single flag to control fetching
  const limit = 10;
  
  // Get user region and platform data for API calls
  const userRegion = userData?.autoRegion ? userData.cmRegion : userData?.region;
  const userPlatform = userData?.platform;

  // Wait initially before first fetch to ensure userData is loaded
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldFetch(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch sessions data when needed
  const fetchSessionsData = useCallback(async () => {
    if (!shouldFetch) return;
    if (isLoggedIn && isUserLoading) return; // Wait for user data if logged in
    
    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching sessions with status:", statusFilter, 
                 "region:", userRegion, "platform:", userPlatform);
      
      const result = await fetchSessions(
        isLoggedIn, 
        currentPage, 
        limit, 
        statusFilter,
        userRegion,
        userPlatform
      );
      
      if (result.sessions) {
        setSessions(result.sessions);
        setFilteredSessions(result.sessions);
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
  }, [isLoggedIn, currentPage, limit, statusFilter, userRegion, userPlatform, isUserLoading, shouldFetch]);
  
  // Apply friend filter - separate from data fetching
  const applyFilters = useCallback(() => {
    // Only for friend filtering, not status filtering
    if (friendFilter === "Friends") {
      // Placeholder for friend filtering logic
      // This will be implemented later
    }
  }, [friendFilter]);

  // Apply friend filtering whenever that filter or session data changes
  useEffect(() => {
    if (sessions.length > 0) {
      const filtered = [...sessions];
      // Friend filtering would go here
      setFilteredSessions(filtered);
    }
  }, [sessions, friendFilter, applyFilters]);

  // Single main effect for fetching sessions
  useEffect(() => {
    fetchSessionsData();
  }, [currentPage, statusFilter, shouldFetch, fetchSessionsData]);
  
  // Handler for refresh button
  const handleRefresh = () => {
    if (!isLoading) {
      fetchSessionsData(); // Direct call, no state updates that would trigger useEffects
    }
  };

  // Status filter change handler
  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  async function handleJoinSession(sessionId: string) {
    // Require authentication to join a session
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    try {
      // Check if the session is open before attempting to join
      const session = sessions.find(s => s.id === sessionId);
      if (!session || session.status !== 'Open') {
        return;
      }

      // Navigate to the join page with the session ID
      router.push(`/sessions/join?id=${sessionId}`);
    } catch (error: unknown) {
      console.error(error);
    }
  }

  function getStatusBadgeClass(status: Session['status']) {
    switch (status) {
      case 'Open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'InProgress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  function getHostName(session: Session) {
    const host = session.joinedPlayers.find(player => player.userId === session.hostId);
    return host ? host.username : 'Unknown';
  }

  // Determine which dataset to display based on login status
  const hasFullData = isLoggedIn && sessions.length > 0;
  //todo
  //const dataToDisplay = hasFullData ? filteredSessions : minimalSessions;
  const isEmptyResult = (hasFullData && filteredSessions.length === 0) || (!hasFullData && minimalSessions.length === 0);

  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-6 md:py-10 px-4 sm:px-6 md:px-8 mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-6">Available Sessions</h1>
        <p className="mb-6 md:mb-8 text-sm md:text-base text-muted-foreground">Join a session or create your own to start playing with other Nightreign enthusiasts.</p>
        
        <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Looking for a session?</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto order-2 sm:order-1"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh Sessions"}
            </Button>
            <Button className="w-full sm:w-auto order-1 sm:order-2" asChild>
              <Link href={isLoggedIn ? "/sessions/create" : "/login?redirect=/sessions/create"}>Create Session</Link>
            </Button>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <h3 className="text-base font-medium mb-3">Filter Sessions</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full">
              {/* Desktop View - Keep original select */}
              <div className="hidden md:block">
                <label htmlFor="status-filter" className="block text-sm font-medium mb-1">Status</label>
                <select 
                  id="status-filter"
                  className="w-full p-2 rounded-md border bg-background"
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              
              {/* Mobile View - Use styled Select component */}
              <div className="block md:hidden">
                <label htmlFor="mobile-status-filter" className="block text-sm font-medium mb-1">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => handleStatusFilterChange(value as StatusFilter)}
                >
                  <SelectTrigger id="mobile-status-filter" className="h-10 w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isLoggedIn && (
              <div className="w-full">
                {/* Desktop View - Keep original select */}
                <div className="hidden md:block">
                  <label htmlFor="friend-filter" className="block text-sm font-medium mb-1">Players</label>
                  <select 
                    id="friend-filter"
                    className="w-full p-2 rounded-md border bg-background"
                    value={friendFilter}
                    onChange={(e) => setFriendFilter(e.target.value as FriendFilter)}
                  >
                    <option value="All">All Players</option>
                    <option value="Friends">Friends Only</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Friend filtering coming soon!</p>
                </div>
                
                {/* Mobile View - Use styled Select component */}
                <div className="block md:hidden">
                  <label htmlFor="mobile-friend-filter" className="block text-sm font-medium mb-1">Players</label>
                  <Select
                    value={friendFilter}
                    onValueChange={(value) => setFriendFilter(value as FriendFilter)}
                  >
                    <SelectTrigger id="mobile-friend-filter" className="h-10 w-full">
                      <SelectValue placeholder="Select players" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Players</SelectItem>
                      <SelectItem value="Friends">Friends Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Friend filtering coming soon!</p>
                </div>
              </div>
            )}
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
          <div className="flex justify-center py-8">
            <p>Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="p-4 border rounded-lg bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-300">
            <p>{error}</p>
          </div>
        ) : isEmptyResult ? (
          <div className="p-3 md:p-4 border rounded-lg shadow-sm bg-card">
            <p className="text-base md:text-lg font-medium">No matching sessions available.</p>
            <p className="text-sm md:text-base text-muted-foreground">Try adjusting your filters or create a new session.</p>
          </div>
        ) : (
          <>
            {/* Desktop view - Table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Session Name</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Status</TableHead>
                    {isLoggedIn && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hasFullData ? (
                    // Full data display for authenticated users
                    filteredSessions
                      .slice((currentPage - 1) * limit, currentPage * limit)
                      .map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.name}</TableCell>
                        <TableCell>{getHostName(session)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(session.status)}`}>
                            {session.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {session.status === 'Open' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleJoinSession(session.id)}
                            >
                              Join Session
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not Available</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // Minimal data display for non-authenticated users
                    minimalSessions
                      .slice((currentPage - 1) * limit, currentPage * limit)
                      .map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.name}</TableCell>
                        <TableCell>{session.hostName}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(session.status)}`}>
                            {session.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile view - Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {hasFullData ? (
                // Full data display for authenticated users
                filteredSessions
                  .slice((currentPage - 1) * limit, currentPage * limit)
                  .map((session) => (
                  <div key={session.id} className="p-4 border rounded-lg bg-card shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-base truncate">{session.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      <p>Host: {getHostName(session)}</p>
                    </div>
                    <div className="mt-3">
                      {session.status === 'Open' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => handleJoinSession(session.id)}
                        >
                          Join Session
                        </Button>
                      ) : (
                        <div className="text-center text-xs text-muted-foreground py-1">
                          Not Available
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                // Minimal data display for non-authenticated users
                minimalSessions
                  .slice((currentPage - 1) * limit, currentPage * limit)
                  .map((session) => (
                  <div key={session.id} className="p-4 border rounded-lg bg-card shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-base truncate">{session.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      <p>Host: {session.hostName}</p>
                    </div>
                    {!isLoggedIn && (
                      <div className="mt-3 text-center">
                        <Link href="/login" className="text-xs text-indigo-400 hover:text-indigo-500">
                          Login to join sessions
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4">
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
      </div>
    </MainLayout>
  );
}
