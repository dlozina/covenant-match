"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(30, { message: "Username must not be longer than 30 characters" }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" }),
  displayName: z
    .string()
    .min(2, { message: "Display name must be at least 2 characters" })
    .max(30, { message: "Display name must not be longer than 30 characters" }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function EditProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
    },
  })

  useEffect(() => {
    async function fetchProfile() {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const token = localStorage.getItem('token');
        
        if (!token) {
          toast.error("Authentication required");
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
        
        // Set form values with the fetched profile data
        form.reset({
          username: data.username,
          email: data.email,
          displayName: data.displayName,
        })
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to load profile")
        // Redirect to login if not authenticated
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [form, router])

  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true)

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error("Authentication required");
        router.push('/login');
        return;
      }
      
      const response = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Parse the error response to get the specific message
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      toast.success("Profile updated successfully!")
      router.push('/profile')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteProfile() {
    if (window.confirm("Are you sure you want to delete your profile? This action cannot be undone.")) {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const token = localStorage.getItem('token');
        
        if (!token) {
          toast.error("Authentication required");
          router.push('/login');
          return;
        }
        
        const response = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        if (!response.ok) {
          // Parse the error response to get the specific message
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete profile');
        }

        // Clear token and other stored data
        localStorage.removeItem('token');
        
        toast.success("Profile deleted successfully");
        router.push('/');
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to delete profile");
      }
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-10">
        <div className="flex justify-center">
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your profile information
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} readOnly disabled className="bg-muted" />
                  </FormControl>
                  <FormDescription>
                    Your username cannot be changed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" type="email" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your email address will be used for notifications and recovery.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Display Name" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is how other users will see you.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/profile')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-muted-foreground mb-4">
            Once you delete your profile, there is no going back. Please be certain.
          </p>
          <Button 
            variant="destructive" 
            onClick={handleDeleteProfile}
          >
            Delete Profile
          </Button>
        </div>
      </div>
    </div>
  )
} 