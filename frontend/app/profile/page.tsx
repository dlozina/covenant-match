"use client"

import { useState, useEffect } from "react"
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

interface UserProfile {
  username: string
  email: string
  displayName: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const token = localStorage.getItem('token');

        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }

        const data = await response.json()
        setProfile(data)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to load profile")
        // Redirect to login if not authenticated
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [router])

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

  if (!profile) {
    return null
  }

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
              <CardTitle className="text-lg md:text-xl">{profile.displayName}</CardTitle>
              <CardDescription className="text-sm">@{profile.username}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 md:px-6 py-2 md:py-4">
              <div>
                <h3 className="text-sm md:text-base font-medium">Email</h3>
                <p className="text-sm md:text-base text-muted-foreground break-words">{profile.email}</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 px-4 md:px-6 py-4 md:py-6">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={() => {
                  // Verify token exists before navigation
                  const token = localStorage.getItem('token');
                  if (token) {
                    router.push('/edit-profile');
                  } else {
                    toast.error("Authentication required");
                    router.push('/login');
                  }
                }}
              >
                Edit Profile
              </Button>
              <Button 
                variant="destructive" 
                className="w-full sm:w-auto"
                onClick={() => {
                  // Implement logout functionality
                  localStorage.removeItem('token');
                  toast.success("Logged out successfully");
                  router.push('/login');
                }}
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