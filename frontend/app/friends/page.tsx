"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserX, Shield, Swords, Trophy, UserCheck, UserMinus } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Notification, NotificationType } from "@/components/ui/notification"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious
} from "@/components/ui/pagination"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserService, FriendRequestResponse} from "@/utils/api/user-service"
import { Friend, UserStats } from "@/utils/api/types"
import { StatisticsService } from "@/utils/api/statistics-service"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// API Response types that match the actual backend response
interface MongoDBDate {
  $date: {
    $numberLong: string;
  };
}

interface ActualFriendRequestResponse {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_username: string;
  receiver_username: string | null;
  sender_avatar: string | null;
  receiver_avatar: string | null;
  status: string;
  created_at: MongoDBDate;
  updated_at: MongoDBDate;
}

interface PaginationMetadata {
  totalCount: number;
  pageCount: number;
  currentPage: number;
  perPage: number;
}

interface ActualPaginatedFriendRequests {
  requests: ActualFriendRequestResponse[];
  metadata: PaginationMetadata;
}

// Define the actual response type structure for the has-pending endpoint
// interface NestedPendingRequestsResponse {
//   has_pending_requests: {
//     has_pending_requests: boolean;
//   };
// }

export default function FriendsPage() {
  return (
    <ProtectedRoute>
      <FriendsContent />
    </ProtectedRoute>
  );
}

type FriendWithStats = Friend & {
  stats?: UserStats;
};

type FriendRequestWithStats = FriendRequestResponse & {
  stats?: UserStats;
};

function FriendsContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("friends");
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  
  // Loading states for each tab
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingIncoming, setIsLoadingIncoming] = useState(true);
  const [isLoadingOutgoing, setIsLoadingOutgoing] = useState(true);
  
  // State for friends and requests
  const [friends, setFriends] = useState<FriendWithStats[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestWithStats[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestWithStats[]>([]);
  
  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  
  // Pagination state for each tab
  const [friendsPage, setFriendsPage] = useState(1);
  const [incomingPage, setIncomingPage] = useState(1);
  const [outgoingPage, setOutgoingPage] = useState(1);
  
  const [friendsTotalPages, setFriendsTotalPages] = useState(1);
  const [incomingTotalPages, setIncomingTotalPages] = useState(1);
  const [outgoingTotalPages, setOutgoingTotalPages] = useState(1);
  
  // Total count for each tab (for pagination display)
  const [friendsTotalCount, setFriendsTotalCount] = useState(0);
  const [incomingTotalCount, setIncomingTotalCount] = useState(0);
  const [outgoingTotalCount, setOutgoingTotalCount] = useState(0);
  
  const pageSize = 10;
  
  // Check for pending requests on initial load
  useEffect(() => {
    checkPendingRequests();
  }, []);
  
  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "friends") {
      fetchFriends(friendsPage);
    } else if (activeTab === "incoming") {
      fetchIncomingRequests(incomingPage);
    } else if (activeTab === "outgoing") {
      fetchOutgoingRequests(outgoingPage);
    }
  }, [activeTab, friendsPage, incomingPage, outgoingPage]);
  
  const checkPendingRequests = async () => {
    try {
      // The hasPendingFriendRequests function now returns a simple boolean
      const hasPending = await UserService.hasPendingFriendRequests();
      setHasPendingRequests(hasPending);
      
      // If there are pending requests, default to the incoming tab
      if (hasPending) {
        setActiveTab("incoming");
      }
    } catch (error) {
      console.error("Error checking pending requests:", error);
      setHasPendingRequests(false);
    }
  };
  
  const fetchFriends = async (page: number) => {
    // Ensure page is a valid number
    const validPage = Number.isInteger(page) && page > 0 ? page : 1;
    setIsLoadingFriends(true);
    try {
      const response = await UserService.getFriendList(validPage, pageSize);
      
      // Get all user IDs to fetch stats in batch
      const userIds = response.friends.map(friend => friend.id);
      
      // Initialize friends without stats
      const friendsData = response.friends.map(friend => ({
        ...friend,
        stats: undefined
      }));
      
      setFriends(friendsData);
      
      // Calculate total pages - ensure at least 1 page if we have items, otherwise 0
      const totalPages = response.total > 0 ? Math.max(1, Math.ceil(response.total / pageSize)) : 0;
      setFriendsTotalPages(totalPages);
      setFriendsTotalCount(response.total);
      
      // Fetch stats in batch if there are friends
      if (userIds.length > 0) {
        fetchUserStats(userIds, friendsData, setFriends);
      } else {
        setIsLoadingFriends(false);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
      setNotification({
        message: "Failed to load friends list. Please try again.",
        type: 'error'
      });
      setFriendsTotalPages(0);
      setFriendsTotalCount(0);
      setIsLoadingFriends(false);
    }
  };
  
  const fetchIncomingRequests = async (page: number) => {
    // Ensure page is a valid number
    const validPage = Number.isInteger(page) && page > 0 ? page : 1;
    setIsLoadingIncoming(true);
    try {
      const response = await UserService.getIncomingFriendRequests(validPage, pageSize) as unknown as ActualPaginatedFriendRequests;
      
      // Check if response has the expected structure
      if (!response || !response.metadata || !response.requests) {
        console.error("Invalid response structure:", response);
        setIncomingRequests([]);
        setIncomingTotalPages(0);
        setIncomingTotalCount(0);
        setIsLoadingIncoming(false);
        return;
      }
      
      // Map the response to expected format - the API returns different structure
      const mappedRequests = response.requests.map(request => ({
        id: request.id,
        sender: {
          id: request.sender_id,
          username: request.sender_username,
          platform: "Unknown" // This might need to be fetched separately -> remove it for now
        },
        receiver: {
          id: request.receiver_id,
          username: request.receiver_username || "Unknown",
          platform: "Unknown" // This might need to be fetched separately -> remove it for now
        },
        status: request.status,
        createdAt: request.created_at?.$date?.$numberLong 
          ? new Date(parseInt(request.created_at.$date.$numberLong)).toISOString()
          : new Date().toISOString(),
        stats: undefined
      }));
      
      // Get user IDs to fetch stats
      const userIds = mappedRequests.map(request => request.sender.id);
      
      setIncomingRequests(mappedRequests);
      
      // Calculate total pages - ensure at least 1 page if we have items, otherwise 0
      const totalCount = response.metadata.totalCount || 0;
      const totalPages = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 0;
      setIncomingTotalPages(totalPages);
      setIncomingTotalCount(totalCount);
      
      if (userIds.length > 0) {
        fetchRequestStats(userIds, mappedRequests, setIncomingRequests, 'sender');
      } else {
        setIsLoadingIncoming(false);
      }
    } catch (error) {
      console.error("Error fetching incoming requests:", error);
      // Set empty array on error to avoid infinite loading state
      setIncomingRequests([]);
      setIncomingTotalPages(0);
      setIncomingTotalCount(0);
      setNotification({
        message: "Failed to load friend requests. Please try again.",
        type: 'error'
      });
      setIsLoadingIncoming(false);
    }
  };
  
  const fetchOutgoingRequests = async (page: number) => {
    // Ensure page is a valid number
    const validPage = Number.isInteger(page) && page > 0 ? page : 1;
    setIsLoadingOutgoing(true);
    try {
      const response = await UserService.getOutgoingFriendRequests(validPage, pageSize) as unknown as ActualPaginatedFriendRequests;
      
      // Check if response has the expected structure
      if (!response || !response.metadata || !response.requests) {
        console.error("Invalid response structure:", response);
        setOutgoingRequests([]);
        setOutgoingTotalPages(0);
        setOutgoingTotalCount(0);
        setIsLoadingOutgoing(false);
        return;
      }
      
      // Map the response to expected format - the API returns different structure
      const mappedRequests = response.requests.map(request => ({
        id: request.id,
        sender: {
          id: request.sender_id,
          username: request.sender_username,
          platform: "Unknown"
        },
        receiver: {
          id: request.receiver_id,
          username: request.receiver_username || "Unknown",
          platform: "Unknown"
        },
        status: request.status,
        createdAt: request.created_at?.$date?.$numberLong 
          ? new Date(parseInt(request.created_at.$date.$numberLong)).toISOString()
          : new Date().toISOString(),
        stats: undefined
      }));
      
      // Get user IDs to fetch stats
      const userIds = mappedRequests.map(request => request.receiver.id);
      
      setOutgoingRequests(mappedRequests);
      
      // Calculate total pages - ensure at least 1 page if we have items, otherwise 0
      const totalCount = response.metadata.totalCount || 0;
      const totalPages = totalCount > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 0;
      setOutgoingTotalPages(totalPages);
      setOutgoingTotalCount(totalCount);
      
      if (userIds.length > 0) {
        fetchRequestStats(userIds, mappedRequests, setOutgoingRequests, 'receiver');
      } else {
        setIsLoadingOutgoing(false);
      }
    } catch (error) {
      console.error("Error fetching outgoing requests:", error);
      // Set empty array on error to avoid infinite loading state
      setOutgoingRequests([]);
      setOutgoingTotalPages(0);
      setOutgoingTotalCount(0);
      setNotification({
        message: "Failed to load friend requests. Please try again.",
        type: 'error'
      });
      setIsLoadingOutgoing(false);
    }
  };
  
  const fetchUserStats = async (
    userIds: string[],
    userData: FriendWithStats[],
    setStateCallback: React.Dispatch<React.SetStateAction<FriendWithStats[]>>
  ) => {
    try {
      const statsResponse = await StatisticsService.getBatchStatistics(userIds);
      
      if (!statsResponse.data || !Array.isArray(statsResponse.data)) {
        console.error("Invalid response format - data is not an array:", statsResponse);
        // Always end the loading state even if we couldn't get stats
        setIsLoadingFriends(false);
        return;
      }
      
      // Map stats to users
      const updatedData = userData.map(user => {
        const stats = statsResponse.data.find((stat: UserStats) => stat.userId === user.id);
        return {
          ...user,
          stats: stats
        };
      });
      
      setStateCallback(updatedData);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      // Make sure to end loading state on error
      setIsLoadingFriends(false);
    } finally {
      // Always end loading state to avoid infinite loading
      setIsLoadingFriends(false);
    }
  };
  
  const fetchRequestStats = async (
    userIds: string[],
    requestData: FriendRequestWithStats[],
    setStateCallback: React.Dispatch<React.SetStateAction<FriendRequestWithStats[]>>,
    userType: 'sender' | 'receiver'
  ) => {
    try {
      const statsResponse = await StatisticsService.getBatchStatistics(userIds);
      
      if (!statsResponse.data || !Array.isArray(statsResponse.data)) {
        console.error("Invalid response format - data is not an array:", statsResponse);
        // End loading state even if we couldn't get the stats
        if (userType === 'sender') {
          setIsLoadingIncoming(false);
        } else {
          setIsLoadingOutgoing(false);
        }
        return;
      }
      
      // Map stats to requests
      const updatedData = requestData.map(request => {
        const userId = request[userType].id;
        const stats = statsResponse.data.find((stat: UserStats) => stat.userId === userId);
        return {
          ...request,
          stats: stats
        };
      });
      
      setStateCallback(updatedData);
    } catch (error) {
      console.error("Error fetching request stats:", error);
      // End loading state on error
      if (userType === 'sender') {
        setIsLoadingIncoming(false);
      } else {
        setIsLoadingOutgoing(false);
      }
    } finally {
      // Ensure loading states are updated correctly
      if (userType === 'sender') {
        setIsLoadingIncoming(false);
      } else if (userType === 'receiver') {
        setIsLoadingOutgoing(false);
      }
      // Only update the friends loading state if that's the active tab
      if (activeTab === "friends") {
        setIsLoadingFriends(false);
      }
    }
  };
  
  // Filter data based on search query
  const filteredFriends = friends.filter(friend => 
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredIncoming = incomingRequests.filter(request => 
    request.sender.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredOutgoing = outgoingRequests.filter(request => 
    request.receiver.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Reset to first page when searching in current tab
    if (activeTab === "friends") setFriendsPage(1);
    if (activeTab === "incoming") setIncomingPage(1);
    if (activeTab === "outgoing") setOutgoingPage(1);
  };
  
  // Pagination handlers for each tab
  const handleFriendsPageChange = (page: number) => {
    if (Number.isInteger(page) && page > 0) {
      setFriendsPage(page);
    }
  };
  
  const handleIncomingPageChange = (page: number) => {
    if (Number.isInteger(page) && page > 0) {
      setIncomingPage(page);
    }
  };
  
  const handleOutgoingPageChange = (page: number) => {
    if (Number.isInteger(page) && page > 0) {
      setOutgoingPage(page);
    }
  };
  
  // Function to get visible page numbers for pagination
  function getVisiblePageNumbers(currentPage: number, totalPages: number): (number | null)[] {
    // If no pages or only one page, return empty array
    if (totalPages <= 1) {
      return totalPages === 1 ? [1] : [];
    }
    
    // For small number of pages, show all pages
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const result: (number | null)[] = [];
    
    // Always include page 1
    result.push(1);
    
    // For current pages near the beginning
    if (currentPage <= 3) {
      result.push(2);
      if (totalPages >= 3) result.push(3);
      if (totalPages >= 4) result.push(4);
      if (totalPages > 5) {
        result.push(null); // Ellipsis
        result.push(totalPages);
      } else if (totalPages === 5) {
        result.push(5);
      }
    } 
    // For current pages near the end
    else if (currentPage >= totalPages - 2) {
      result.push(null); // Ellipsis
      if (totalPages - 4 > 1) result.push(totalPages - 4);
      if (totalPages - 3 > 1) result.push(totalPages - 3);
      if (totalPages - 2 > 1) result.push(totalPages - 2);
      if (totalPages - 1 > 1) result.push(totalPages - 1);
      result.push(totalPages);
    } 
    // For current pages in the middle
    else {
      result.push(null); // Ellipsis before current
      result.push(currentPage - 1);
      result.push(currentPage);
      result.push(currentPage + 1);
      if (totalPages > currentPage + 1) {
        result.push(null); // Ellipsis after current
        result.push(totalPages);
      }
    }
    
    // Remove any duplicate values
    return result.filter((value, index, self) => 
      index === self.findIndex(v => v === value)
    );
  }
  
  // Friend action handlers
  const openRemoveFriendDialog = (friend: Friend) => {
    setFriendToRemove(friend);
    setConfirmDialogOpen(true);
  };
  
  const handleRemoveFriend = async (id: string) => {
    try {
      await UserService.removeFriend(id);
      setFriends(prev => prev.filter(friend => friend.id !== id));
      setNotification({
        message: "Friend removed",
        type: 'success'
      });
    } catch (error) {
      console.error("Error removing friend:", error);
      setNotification({
        message: "Failed to remove friend",
        type: 'error'
      });
    } finally {
      setConfirmDialogOpen(false);
      setFriendToRemove(null);
    }
  };
  
  // Friend request handlers
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await UserService.acceptFriendRequest(requestId);
      // Remove request from incoming list
      setIncomingRequests(prev => prev.filter(request => request.id !== requestId));
      
      // Refresh friends list if it's active
      if (activeTab === "friends") {
        fetchFriends(friendsPage);
      }
      
      // Check if there are still pending requests
      checkPendingRequests();
      
      setNotification({
        message: "Friend request accepted",
        type: 'success'
      });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      setNotification({
        message: "Failed to accept friend request",
        type: 'error'
      });
    }
  };
  
  const handleRejectRequest = async (requestId: string) => {
    try {
      await UserService.rejectFriendRequest(requestId);
      // Remove request from incoming list
      setIncomingRequests(prev => prev.filter(request => request.id !== requestId));
      
      // Check if there are still pending requests
      checkPendingRequests();
      
      setNotification({
        message: "Friend request rejected",
        type: 'warning'
      });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      setNotification({
        message: "Failed to reject friend request",
        type: 'error'
      });
    }
  };
  
  const handleCancelRequest = async (requestId: string) => {
    try {
      // Using reject handler as canceling is functionally the same on the backend
      await UserService.rejectFriendRequest(requestId);
      // Remove request from outgoing list
      setOutgoingRequests(prev => prev.filter(request => request.id !== requestId));
      
      setNotification({
        message: "Friend request canceled",
        type: 'warning'
      });
    } catch (error) {
      console.error("Error canceling friend request:", error);
      setNotification({
        message: "Failed to cancel friend request",
        type: 'error'
      });
    }
  };
  
  // Clear notification
  const clearNotification = () => {
    setNotification(null);
  };
  
  // Render loading states
  const renderLoading = () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
  
  // Render pagination
  const renderPagination = (
    currentPage: number, 
    totalPages: number, 
    totalItems: number,
    handlePageChange: (page: number) => void
  ) => {
    // Only show pagination if we have items and more than 1 page
    if (totalPages <= 0 || totalItems === 0) return null;
    
    // Calculate visible page numbers
    const visiblePages = getVisiblePageNumbers(currentPage, totalPages);
    
    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) {
                  handlePageChange(currentPage - 1);
                }
              }}
              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {/* Hide page numbers on small screens */}
          {visiblePages.length > 0 && (
            <div className="hidden sm:flex">
              {visiblePages.map((page, index) => {
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
                  <PaginationItem key={`page-${page}`}>
                    <PaginationLink 
                      href="#"
                      isActive={currentPage === page}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
            </div>
          )}
          
          {/* Show current page indicator on mobile */}
          <div className="flex sm:hidden items-center px-2">
            <span className="text-sm">
              Page {currentPage} of {totalPages || 1} ({totalItems} {totalItems === 1 ? "item" : "items"})
            </span>
          </div>
          
          {/* Show total items on desktop */}
          <div className="hidden sm:flex items-center px-2 text-sm text-muted-foreground">
            {totalItems} {totalItems === 1 ? "item" : "items"} total
          </div>
          
          <PaginationItem>
            <PaginationNext 
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) {
                  handlePageChange(currentPage + 1);
                }
              }}
              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  // Render stats for a user
  const renderUserStats = (stats?: UserStats) => {
    if (!stats) {
      return (
        <div className="text-xs text-muted-foreground mt-1">
          No stats available
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="flex items-center text-xs text-amber-500">
          <Swords size={12} className="mr-0.5" />
          <span>{stats.totalGames}</span>
        </div>
        <div className="flex items-center text-xs text-green-500">
          <Trophy size={12} className="mr-0.5" />
          <span>{stats.wins}</span>
        </div>
        <div className="flex items-center text-xs text-red-500">
          <Shield size={12} className="mr-0.5" />
          <span>{stats.losses}</span>
        </div>
        <div className="text-xs text-muted-foreground ml-1">
          {stats.winRate}% WR
        </div>
      </div>
    );
  };
  
  return (
    <MainLayout footer={<Footer />}>
      <div className="container max-w-4xl py-6 md:py-10 px-4 mx-auto">
        <div className="space-y-6">
          {/* Header with search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Friends</h1>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-9 h-10"
              />
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile Select - Hidden on Desktop */}
            <div className="md:hidden mb-4">
              <Select 
                value={activeTab} 
                onValueChange={setActiveTab}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {activeTab === "friends" ? "Friends" : 
                     activeTab === "incoming" ? "Incoming Requests" : 
                     "Outgoing Requests"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friends">
                    Friends
                  </SelectItem>
                  <SelectItem value="incoming" className="relative">
                    <div className="flex items-center">
                      Incoming Requests
                      {hasPendingRequests && (
                        <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>
                      )}
                    </div>
                  </SelectItem>
                  <SelectItem value="outgoing">
                    Outgoing Requests
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Desktop Tabs - Hidden on Mobile */}
            <TabsList className="grid w-full grid-cols-3 hidden md:grid">
              <TabsTrigger value="friends">
                Friends
              </TabsTrigger>
              <TabsTrigger value="incoming" className="relative">
                Incoming Requests
                {hasPendingRequests && (
                  <Badge variant="success" className="absolute -top-1 -right-1 h-2 w-2 p-0" />
                )}
              </TabsTrigger>
              <TabsTrigger value="outgoing">
                Outgoing Requests
              </TabsTrigger>
            </TabsList>
            
            {/* Friends Tab */}
            <TabsContent value="friends" className="space-y-4">
              <div className="px-1 py-2 text-sm text-muted-foreground">
                <p>Your current friends. Remove a friend by clicking the X button.</p>
              </div>
              
              {isLoadingFriends ? (
                renderLoading()
              ) : friends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">You don&apos;t have any friends yet</p>
                  <p className="text-sm text-muted-foreground">
                    Play sessions to meet new nightfarers and add them as friends.
                  </p>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No friends found matching &quot;{searchQuery}&quot;</p>
                  <p className="text-sm text-muted-foreground">
                    Try a different search term.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4">
                    {filteredFriends.map((friend) => (
                      <div key={friend.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg shadow-sm bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-purple-700 to-indigo-900 text-white">
                              {friend.username?.substring(0, 2) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{friend.username}</div>
                            <div className="text-sm text-muted-foreground">
                              {friend.stats?.covenantName && `${friend.stats.covenantName}`}
                            </div>
                            
                            {renderUserStats(friend.stats)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 sm:mt-0 ml-12 sm:ml-0 sm:h-full">
                          {friend.stats ? (
                            <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs mr-2">
                              {friend.stats.experience}
                            </div>
                          ) : (
                            <div className="bg-secondary/50 text-muted-foreground px-2 py-1 rounded text-xs mr-2">
                              Unknown
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openRemoveFriendDialog(friend)}
                            className="text-muted-foreground hover:text-red-500 h-9 w-9 sm:my-auto"
                          >
                            <UserX className="h-5 w-5" />
                            <span className="sr-only">Remove friend</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination for friends */}
                  {renderPagination(friendsPage, friendsTotalPages, friendsTotalCount, handleFriendsPageChange)}
                </>
              )}
            </TabsContent>
            
            {/* Incoming Requests Tab */}
            <TabsContent value="incoming" className="space-y-4">
              <div className="px-1 py-2 text-sm text-muted-foreground">
                <p>Friend requests from other players. Accept or decline as desired.</p>
              </div>
              
              {isLoadingIncoming ? (
                renderLoading()
              ) : incomingRequests.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No incoming friend requests</p>
                  <p className="text-sm text-muted-foreground">
                    When someone sends you a friend request, it will appear here.
                  </p>
                </div>
              ) : filteredIncoming.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No requests found matching &quot;{searchQuery}&quot;</p>
                  <p className="text-sm text-muted-foreground">
                    Try a different search term.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4">
                    {filteredIncoming.map((request) => (
                      <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg shadow-sm bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-purple-700 to-indigo-900 text-white">
                              {request.sender.username.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{request.sender.username}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.stats?.covenantName && `${request.stats.covenantName}`}
                            </div>
                            
                            {renderUserStats(request.stats)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 sm:mt-0 ml-12 sm:ml-0">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleAcceptRequest(request.id)}
                            className="text-white"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRejectRequest(request.id)}
                            className="text-muted-foreground"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination for incoming */}
                  {renderPagination(incomingPage, incomingTotalPages, incomingTotalCount, handleIncomingPageChange)}
                </>
              )}
            </TabsContent>
            
            {/* Outgoing Requests Tab */}
            <TabsContent value="outgoing" className="space-y-4">
              <div className="px-1 py-2 text-sm text-muted-foreground">
                <p>Friend requests you&apos;ve sent that are waiting for a response.</p>
              </div>
              
              {isLoadingOutgoing ? (
                renderLoading()
              ) : outgoingRequests.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No outgoing friend requests</p>
                  <p className="text-sm text-muted-foreground">
                    You haven&apos;t sent any friend requests yet.
                  </p>
                </div>
              ) : filteredOutgoing.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No requests found matching &quot;{searchQuery}&quot;</p>
                  <p className="text-sm text-muted-foreground">
                    Try a different search term.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4">
                    {filteredOutgoing.map((request) => (
                      <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg shadow-sm bg-card">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-purple-700 to-indigo-900 text-white">
                              {request.receiver.username.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{request.receiver.username}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.stats?.covenantName && `${request.stats.covenantName}`}
                            </div>
                            
                            {renderUserStats(request.stats)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 sm:mt-0 ml-12 sm:ml-0">
                          <div className="text-xs text-muted-foreground mr-2">
                            Pending...
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleCancelRequest(request.id)}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <UserMinus className="h-4 w-4" />
                            <span className="sr-only">Cancel request</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination for outgoing */}
                  {renderPagination(outgoingPage, outgoingTotalPages, outgoingTotalCount, handleOutgoingPageChange)}
                </>
              )}
            </TabsContent>
          </Tabs>
          
          {/* Confirmation Dialog */}
          <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove <span className="font-semibold">{friendToRemove?.username}</span> from your friends list?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setFriendToRemove(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => friendToRemove && handleRemoveFriend(friendToRemove.id)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {/* Notification component */}
          <Notification
            notification={notification}
            onDismiss={clearNotification}
          />
        </div>
      </div>
    </MainLayout>
  );
} 