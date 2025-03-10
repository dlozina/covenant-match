"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
      <div className="container max-w-2xl py-10">
        <div className="flex justify-center">
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground">
            View and manage your profile information
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{profile.displayName}</CardTitle>
            <CardDescription>@{profile.username}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">Email</h3>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
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
  )
} 