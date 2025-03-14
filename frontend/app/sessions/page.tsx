"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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

interface JoinedPlayer {
  userId: string;
  username: string;
  nightfarer: string;
  joinedAt: string;
}

interface Session {
  id: string;
  name: string;
  hostId: string;
  status: "Open" | "InProgress" | "Completed";
  nightLord: string;
  joinedPlayers: JoinedPlayer[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  password: string;
}

type StatusFilter = "All" | "Open" | "InProgress" | "Completed";
type FriendFilter = "All" | "Friends";

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Open");
  const [friendFilter, setFriendFilter] = useState<FriendFilter>("All");
  const limit = 10;

  useEffect(() => {
    fetchSessions();
  }, [currentPage, statusFilter]);

  useEffect(() => {
    applyFilters();
  }, [sessions, friendFilter]);

  function applyFilters() {
    const result = [...sessions];
    
    // Status filtering is now handled at the API level
    
    // Apply friend filter (placeholder for future implementation)
    if (friendFilter === "Friends") {
      // This will be implemented later
      // For now, we'll just show a toast message
      toast.info("Friend filtering will be implemented soon!");
    }
    
    setFilteredSessions(result);
    
    // Update pagination based on filtered results
    setTotalPages(Math.max(1, Math.ceil(result.length / limit)));
    if (currentPage > Math.ceil(result.length / limit) && result.length > 0) {
      setCurrentPage(1);
    }
  }

  async function fetchSessions() {
    setIsLoading(true);
    setError(null);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error("Authentication required");
        router.push('/login');
        return;
      }

      const offset = (currentPage - 1) * limit;
      // Add status parameter to only fetch sessions with the current status filter
      const statusParam = statusFilter !== 'All' ? `&status=${statusFilter}` : '';
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions?limit=${limit}&offset=${offset}${statusParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data);
      
      // For now, we'll just assume there are more pages if we get a full page of results
      // In a real implementation, you'd want to get the total count from the API
      setTotalPages(data.length === limit ? currentPage + 1 : currentPage);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to load sessions");
      toast.error(error instanceof Error ? error.message : "Failed to load sessions");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleJoinSession(sessionId: string) {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error("Authentication required");
        router.push('/login');
        return;
      }

      // Check if the session is open before attempting to join
      const session = sessions.find(s => s.id === sessionId);
      if (!session || session.status !== 'Open') {
        toast.error("You can only join open sessions");
        return;
      }

      // This is a placeholder - you'll need to implement the actual join session API call
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join session');
      }

      toast.success("Successfully joined session!");
      router.push(`/sessions/${sessionId}`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to join session");
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

  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-6 md:py-10 px-4 sm:px-6 md:px-8 mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-6">Available Sessions</h1>
        <p className="mb-6 md:mb-8 text-sm md:text-base text-muted-foreground">Join a session or create your own to start playing with other Nightreign enthusiasts.</p>
        
        <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Looking for a session?</h2>
          </div>
          <Button className="w-full sm:w-auto" asChild>
            <Link href="/sessions/create">Create Session</Link>
          </Button>
        </div>
        
        {/* Filter Section */}
        <div className="mb-6 p-4 border rounded-lg bg-card">
          <h3 className="text-base font-medium mb-3">Filter Sessions</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/2">
              <label htmlFor="status-filter" className="block text-sm font-medium mb-1">Status</label>
              <select 
                id="status-filter"
                className="w-full p-2 rounded-md border bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="InProgress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="w-full sm:w-1/2">
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
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="p-4 border rounded-lg bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-300">
            <p>{error}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-3 md:p-4 border rounded-lg shadow-sm bg-card">
            <p className="text-base md:text-lg font-medium">No matching sessions available.</p>
            <p className="text-sm md:text-base text-muted-foreground">Try adjusting your filters or create a new session.</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Session Name</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions
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
                  ))}
                </TableBody>
              </Table>
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
