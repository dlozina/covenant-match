"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Footer } from "@/components/layout/Footer"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/lib/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Friend } from "@/utils/api/types"
import { UserService } from "@/utils/api/user-service"
import { UserMinus } from "lucide-react"
import { toast } from "sonner"

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const router = useRouter()
  const { userData, logout } = useAuth()
  const [isLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendsError, setFriendsError] = useState<string | null>(null)

  // Fetch friends when the friends tab is opened
  useEffect(() => {
    if (activeTab === "friends" && !friends.length && !friendsLoading && !friendsError) {
      fetchFriends()
    }
  }, [activeTab])

  const fetchFriends = async () => {
    setFriendsLoading(true)
    setFriendsError(null)
    try {
      const response = await UserService.getFriendList()
      setFriends(response.friends)
    } catch (error) {
      console.error("Error fetching friends:", error)
      setFriendsError("Failed to load friends list. Please try again later.")
    } finally {
      setFriendsLoading(false)
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await UserService.removeFriend(friendId)
      // Update the local state to reflect the removal
      setFriends(prev => prev.filter(friend => friend.id !== friendId))
      toast.success("Friend removed successfully")
    } catch (error) {
      console.error("Error removing friend:", error)
      toast.error("Failed to remove friend. Please try again.")
    }
  }

  if (isLoading) {
    return (
      <MainLayout footer={<Footer />}>
        <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto">
          <div className="flex justify-center">
            <p>Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!userData) {
    return null
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <MainLayout footer={<Footer />}>
      <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto">
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Your Profile</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              View and manage your profile information
            </p>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="px-4 md:px-6 py-4 md:py-6">
              <CardTitle className="text-lg md:text-xl">{userData.displayName}</CardTitle>
              <CardDescription className="text-sm">@{userData.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 md:px-6 py-2 md:py-4">
              <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="profile">Profile Information</TabsTrigger>
                  <TabsTrigger value="settings">Personal Settings</TabsTrigger>
                  <TabsTrigger value="friends">Friends</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile" className="space-y-6 pt-4">
                  {/* Basics Section */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-primary">Basics</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Username</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.username}</p>
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Email</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.email}</p>
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Display Name</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.displayName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border"></div>

                  {/* Matchmaking Section */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-primary">Matchmaking</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Region</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.region}</p>
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Platform</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.platform}</p>
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Auto Region Detection</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.autoRegion ? "Enabled" : "Disabled"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Detected Covenant-Match Region</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.cmRegion || "Unknown"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border"></div>

                  {/* Fun Section */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-primary">Fun</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Covenant Name</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.covenantName}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-primary">Session Preferences</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Preferred Session Name</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">
                          {userData.preferredSessionName || "Not set"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Preferred Session In-Game Password</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">
                          {userData.preferredSessionPassword || "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="border-t border-border"></div>
                  
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-primary">Game Preferences</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Preferred Nightfarer</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">
                          {userData.preferredNightfarer || "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="friends" className="space-y-6 pt-4">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-primary">Friends List</h2>
                    
                    {friendsLoading ? (
                      <div className="py-8 flex justify-center">
                        <p className="text-muted-foreground">Loading your friends...</p>
                      </div>
                    ) : friendsError ? (
                      <div className="p-4 text-center text-red-500 bg-red-50 rounded-md">
                        <p>{friendsError}</p>
                      </div>
                    ) : friends.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-muted-foreground">You have not added any friends yet.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          You can add friends from player profiles in sessions.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground mb-2">
                          You have {friends.length} {friends.length === 1 ? "friend" : "friends"} (limit: 20)
                        </p>
                        
                        <div className="space-y-3">
                          {friends.map(friend => (
                            <div key={friend.id} className="flex items-center justify-between p-3 rounded-md border">
                              <div>
                                <p className="font-medium">{friend.displayName || friend.username}</p>
                                <p className="text-sm text-muted-foreground">@{friend.username}</p>
                                <div className="flex mt-1 text-xs text-muted-foreground">
                                  <span className="mr-2">{friend.covenantName}</span>
                                  <span className="mr-2">•</span>
                                  <span className="mr-2">{friend.region}</span>
                                  <span className="mr-2">•</span>
                                  <span>{friend.platform}</span>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemoveFriend(friend.id)}
                                title="Remove friend"
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 px-4 md:px-6 py-4 md:py-6">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => router.push('/profile/edit')}
              >
                Edit Profile
              </Button>
              <Button 
                variant="destructive" 
                className="w-full sm:w-auto"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
} 