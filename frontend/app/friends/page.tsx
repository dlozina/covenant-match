"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserX } from "lucide-react"
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
import { Friend } from "@/utils/api/types"

export default function FriendsPage() {
  return (
    <ProtectedRoute>
      <FriendsContent />
    </ProtectedRoute>
  );
}

function FriendsContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for friends
  const [friends, setFriends] = useState<Friend[]>([]);
  
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
      setFriends(response.friends);
      setTotalPages(Math.ceil(response.total / pageSize));
    } catch (error) {
      console.error("Error fetching friends:", error);
      setNotification({
        message: "Failed to load friends list. Please try again.",
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => 
    (friend.displayName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
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
            {filteredFriends.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground mb-4">No friends found</p>
                <p className="text-sm text-muted-foreground">
                  Complete sessions with other nightfarers to add them as friends.
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
                            {friend.displayName?.substring(0, 2) || friend.username.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{friend.displayName || friend.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {friend.platform} • {friend.region}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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