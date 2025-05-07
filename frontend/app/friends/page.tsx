"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserX, Shield, Swords, Trophy } from "lucide-react"
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
import { UserService } from "@/utils/api/user-service"
import { Friend, UserStats } from "@/utils/api/types"
import { StatisticsService } from "@/utils/api/statistics-service"

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

function FriendsContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for friends
  const [friends, setFriends] = useState<FriendWithStats[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  
  // Load friends data
  useEffect(() => {
    fetchFriends();
  }, []);
  
  const fetchFriends = async () => {
    setIsLoading(true);
    try {
      const response = await UserService.getFriendList();
      
      // Get all user IDs to fetch stats in batch
      const userIds = response.friends.map(friend => friend.id);
      
      // Initialize friends without stats
      const friendsData = response.friends.map(friend => ({
        ...friend,
        stats: undefined
      }));
      
      setFriends(friendsData);
      setTotalPages(Math.ceil(response.total / pageSize));
      
      // Fetch stats in batch if there are friends
      if (userIds.length > 0) {
        fetchFriendsStats(userIds, friendsData);
      } else {
        // Set loading to false if there are no friends
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
      setNotification({
        message: "Failed to load friends list. Please try again.",
        type: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const fetchFriendsStats = async (userIds: string[], friendsData: FriendWithStats[]) => {
    try {
      console.log("Requesting stats for userIds:", userIds);
      const statsResponse = await StatisticsService.getBatchStatistics(userIds);
      
      console.log("Stats API full response:", JSON.stringify(statsResponse, null, 2));
      
      if (!statsResponse.data || !Array.isArray(statsResponse.data)) {
        console.error("Invalid response format - data is not an array:", statsResponse);
        setIsLoading(false);
        return;
      }
      
      console.log("Stats found for users:", statsResponse.data.map(stat => stat.userId));
      console.log("Users with no stats:", userIds.filter(id => 
        !statsResponse.data.some(stat => stat.userId === id)
      ));
      
      // Map stats to friends
      const updatedFriends = friendsData.map(friend => {
        const stats = statsResponse.data.find((stat: UserStats) => stat.userId === friend.id);
        
        if (stats) {
          console.log(`Stats found for friend ${friend.username} (${friend.id})`, stats);
        } else {
          console.log(`No stats found for friend ${friend.username} (${friend.id})`);
        }
        
        return {
          ...friend,
          stats: stats
        };
      });
      
      setFriends(updatedFriends);
    } catch (error) {
      console.error("Error fetching friends stats:", error);
      // We still have basic friend data, so don't show error notification
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => 
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };
  
  // Pagination utils
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Friend action handlers
  const handleRemoveFriend = async (id: string) => {
    try {
      await UserService.removeFriend(id);
      setFriends(prev => prev.filter(friend => friend.id !== id));
      setNotification({
        message: "Friend removed",
        type: 'warning'
      });
    } catch (error) {
      console.error("Error removing friend:", error);
      setNotification({
        message: "Failed to remove friend",
        type: 'error'
      });
    }
  };
  
  // Clear notification
  const clearNotification = () => {
    setNotification(null);
  };
  
  // Display loading state
  if (isLoading) {
    return (
      <MainLayout footer={<Footer />}>
        <div className="container max-w-4xl py-6 md:py-10 px-4 mx-auto">
          <h1 className="text-2xl font-bold mb-6">Friends</h1>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout footer={<Footer />}>
      <div className="container max-w-4xl py-6 md:py-10 px-4 mx-auto">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Friends</h1>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search friends..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-9 h-10"
              />
            </div>
          </div>
          
          <div className="px-1 py-2 text-sm text-muted-foreground">
            <p>Friends can be added after completing a session together.</p>
          </div>
          
          {/* Friends List */}
          <div className="space-y-4">
            {friends.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-4">You don&apos;t have any friends yet</p>
                <p className="text-sm text-muted-foreground">
                  Play regular sessions to meet new nightfarers and add them as friends.
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
                    <div key={friend.id} className="flex items-center justify-between p-4 border rounded-lg shadow-sm bg-card">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-purple-700 to-indigo-900 text-white">
                            {friend.username.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{friend.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {friend.platform} {friend.stats?.covenantName && `• ${friend.stats.covenantName}`}
                          </div>
                          
                          {friend.stats ? (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center text-xs text-amber-500">
                                <Trophy size={12} className="mr-0.5" />
                                <span>{friend.stats.totalGames}</span>
                              </div>
                              <div className="flex items-center text-xs text-green-500">
                                <Swords size={12} className="mr-0.5" />
                                <span>{friend.stats.wins}</span>
                              </div>
                              <div className="flex items-center text-xs text-red-500">
                                <Shield size={12} className="mr-0.5" />
                                <span>{friend.stats.losses}</span>
                              </div>
                              <div className="text-xs text-muted-foreground ml-1">
                                {friend.stats.winRate}% WR
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground mt-1">
                              No stats available
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                          size="sm" 
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <UserX className="h-4 w-4" />
                          <span className="sr-only">Remove friend</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination component */}
                {totalPages > 1 && (
                  <Pagination className="mt-6">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }).map((_, index) => (
                        <PaginationItem key={index}>
                          <PaginationLink 
                            href="#"
                            isActive={currentPage === index + 1}
                            onClick={() => handlePageChange(index + 1)}
                          >
                            {index + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </div>
          
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