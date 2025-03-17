"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
    toast.success("Logged out successfully");
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
              <div>
                <h3 className="text-sm md:text-base font-medium">Email</h3>
                <p className="text-sm md:text-base text-muted-foreground break-words">{userData.email}</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 px-4 md:px-6 py-4 md:py-6">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => router.push('/edit-profile')}
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