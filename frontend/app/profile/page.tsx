"use client"

import { useState } from "react"
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
              <CardTitle className="text-lg md:text-xl">{userData.username}</CardTitle>
              <CardDescription className="text-sm">@{userData.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 md:px-6 py-2 md:py-4">
              <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">
                    <span className="hidden xs:inline">Profile Information</span>
                    <span className="xs:hidden">Profile</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings">
                    <span className="hidden xs:inline">Personal Settings</span>
                    <span className="xs:hidden">Settings</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile" className="space-y-6 pt-4">
                  {/* Basics Section */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-primary">Basics</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Nightfarer Name</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.username}</p>
                      </div>
                      <div>
                        <h3 className="text-sm md:text-base font-medium">Email</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.email}</p>
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
                        <h3 className="text-sm md:text-base font-medium">Experience</h3>
                        <p className="text-sm md:text-base text-muted-foreground break-words">{userData.experience}</p>
                      </div>
                    </div>
                    
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