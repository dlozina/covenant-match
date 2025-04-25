"use client";

import { useState, useEffect } from "react";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Trash2, RefreshCw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AdminSessionService } from "@/utils/api/admin-session-service";

// Define types for session data
export interface AdminSession {
  id: string;
  name: string;
  hostId: string;
  status: "Open" | "Full" | "InProgress" | "Completed" | "Cancelled";
  nightLord: string;
  joinedPlayers: {
    userId: string;
    username: string;
    nightfarer: string;
    covenantName: string;
    region: string;
    platform: string;
    joinedAt: string;
  }[];
  region: string;
  platform: string;
  isPrivate: boolean;
  password: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  statsUpdated: boolean;
  results: {
    userId: string;
    result: "Win" | "Loss" | "Disconnect";
    rating: number | null;
    feedback: string | null;
    submittedAt: string;
  }[];
}

export interface SessionsPaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function AdminSessionsClient() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [pagination, setPagination] = useState<SessionsPaginationResponse>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const router = useRouter();

  // Fetch sessions with pagination
  const loadSessions = async (page = 1, limit = 20, status: string | null = null) => {
    setIsLoading(true);
    try {
      let response;
      
      if (searchQuery.trim()) {
        // Client-side search implementation
        response = await AdminSessionService.getSessions(page, limit, status);
        
        // Validate session data
        if (!response.data.sessions || !Array.isArray(response.data.sessions)) {
          throw new Error("Invalid session data received from API");
        }
        
        // Check for valid session IDs
        const sessionsWithoutIds = response.data.sessions.filter(session => !session.id);
        if (sessionsWithoutIds.length > 0) {
          console.warn("Some sessions are missing IDs:", sessionsWithoutIds);
        }
        
        const filteredSessions = response.data.sessions
          .filter(session => session && session.id) // Ensure session exists and has an ID
          .filter(session => 
            session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.joinedPlayers && session.joinedPlayers.some((player: {username: string}) => 
              player.username.toLowerCase().includes(searchQuery.toLowerCase())
            )
          );
        
        setSessions(filteredSessions);
        
        // Update pagination for filtered results
        const totalFilteredSessions = filteredSessions.length;
        const totalFilteredPages = Math.ceil(totalFilteredSessions / limit);
        
        setPagination({
          total: totalFilteredSessions,
          page: page > totalFilteredPages ? 1 : page,
          limit,
          totalPages: totalFilteredPages || 1,
        });
      } else {
        // Regular API call without search filtering
        response = await AdminSessionService.getSessions(page, limit, status);
        
        // Validate session data
        if (!response.data.sessions || !Array.isArray(response.data.sessions)) {
          throw new Error("Invalid session data received from API");
        }
        
        // Check for valid session IDs
        const sessionsWithoutIds = response.data.sessions.filter(session => !session.id);
        if (sessionsWithoutIds.length > 0) {
          console.warn("Some sessions are missing IDs:", sessionsWithoutIds);
        }
        
        // Filter out sessions without IDs to prevent navigation issues
        const validSessions = response.data.sessions.filter(session => session && session.id);
        setSessions(validSessions);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load sessions list"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(pagination.page, pagination.limit, currentStatus);
  }, [pagination.page, pagination.limit, currentStatus]);

  const handleSearch = () => {
    // Reset to page 1 when searching
    setPagination(prev => ({ ...prev, page: 1 }));
    loadSessions(1, pagination.limit, currentStatus);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleStatusFilter = (status: string | null) => {
    setCurrentStatus(status);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSessionId) return;
    
    try {
      await AdminSessionService.deleteSession(deleteSessionId);
      
      setNotification({
        type: "success",
        message: "Session deleted successfully"
      });
      
      // Refresh the sessions list
      loadSessions(pagination.page, pagination.limit, currentStatus);
    } catch (error) {
      console.error("Error deleting session:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete session"
      });
    } finally {
      setDeleteSessionId(null);
    }
  };

  // Format the date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    
    try {
      // Handle numeric string from MongoDB date format
      if (!isNaN(Number(dateString))) {
        const timestamp = parseInt(dateString);
        if (!isNaN(timestamp)) {
          const date = new Date(timestamp);
          // Return relative time if within last 30 days, otherwise formatted date
          const now = new Date();
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          
          if (date > thirtyDaysAgo) {
            return formatDistanceToNow(date, { addSuffix: true });
          } else {
            return format(date, "PPP");
          }
        }
      }
      
      // Try to parse as ISO string
      const date = new Date(dateString);
      
      // Check if valid date
      if (isNaN(date.getTime())) {
        return "Unknown date";
      }
      
      // Return relative time if within last 30 days, otherwise formatted date
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      if (date > thirtyDaysAgo) {
        return formatDistanceToNow(date, { addSuffix: true });
      } else {
        return format(date, "PPP");
      }
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge className="bg-green-500 hover:bg-green-500">Open</Badge>;
      case "Full":
        return <Badge className="bg-yellow-500 hover:bg-yellow-500">Full</Badge>;
      case "InProgress":
        return <Badge className="bg-blue-500 hover:bg-blue-500">In Progress</Badge>;
      case "Completed":
        return <Badge className="bg-purple-500 hover:bg-purple-500">Completed</Badge>;
      case "Cancelled":
        return <Badge className="bg-red-500 hover:bg-red-500">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-500">{status}</Badge>;
    }
  };

  // Render the sessions list
  const renderSessionList = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-64 flex">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search sessions..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSearch}
                className="ml-2"
              >
                Search
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={currentStatus === null ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilter(null)}
              >
                All
              </Button>
              <Button 
                variant={currentStatus === "Open" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilter("Open")}
              >
                Open
              </Button>
              <Button 
                variant={currentStatus === "Full" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilter("Full")}
              >
                Full
              </Button>
              <Button 
                variant={currentStatus === "InProgress" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilter("InProgress")}
              >
                In Progress
              </Button>
              <Button 
                variant={currentStatus === "Completed" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilter("Completed")}
              >
                Completed
              </Button>
              <Button 
                variant={currentStatus === "Cancelled" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleStatusFilter("Cancelled")}
              >
                Cancelled
              </Button>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadSessions(pagination.page, pagination.limit, currentStatus)}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {sessions.length === 0 ? (
          <div className="p-6 border rounded-lg">
            <p className="text-center text-muted-foreground">No sessions found</p>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{pagination.total}</span> total sessions | 
                Showing <span className="font-medium">{sessions.length}</span> sessions on page <span className="font-medium">{pagination.page}</span>
              </p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.name}
                      {session.isPrivate && (
                        <span className="ml-2 text-xs text-muted-foreground">(Private)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {session.joinedPlayers && session.joinedPlayers.find(p => p.userId === session.hostId)?.username || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {session.joinedPlayers?.length || 0} 
                      <span className="text-xs text-muted-foreground ml-1">players</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(session.createdAt)}
                    </TableCell>
                    <TableCell>{session.region}</TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          console.log("Navigating to session with ID:", session.id);
                          if (session && session.id) {
                            router.push(`/admin/sessions/view/${session.id}`);
                          } else {
                            console.error("Missing session ID for session:", session);
                            setNotification({
                              type: "error",
                              message: "Missing session ID, cannot view details"
                            });
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteSessionId(session.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Manage Sessions</h1>
      
      {notification && (
        <div className="mb-4">
          <Notification
            notification={notification}
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
          <CardDescription>
            View and manage all sessions on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderSessionList()}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this session and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 