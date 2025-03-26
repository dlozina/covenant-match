"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { MainLayout } from "@/components/layout"
import { Footer } from "@/components/layout/Footer"
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
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/lib/auth-context"
import { Notification, NotificationType } from "@/components/ui/notification"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import React from "react"
import { FALLBACK_REGIONS, FALLBACK_PLATFORMS, FALLBACK_COVENANT_NAMES } from "@/lib/constants"

// Username and display name validation regex
const usernameRegex = /^[a-zA-Z0-9_.-]+$/;

// Interface for game data from API
interface PlatformData {
  id: string;
  name: string;
  description: string;
}

interface RegionData {
  id: string;
  name: string;
  description: string;
}

interface CovenantData {
  id: string;
  name: string;
  description: string;
}

interface GameData {
  platforms: PlatformData[];
  regions: RegionData[];
  covenants: CovenantData[];
}

const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(8, { message: "Username must not be longer than 8 characters" })
    .trim()
    .refine(val => usernameRegex.test(val), {
      message: "Username can only contain letters, numbers, underscores, dots, and hyphens"
    }),
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  displayName: z
    .string()
    .min(3, { message: "Display name must be at least 3 characters" })
    .max(8, { message: "Display name must not be longer than 8 characters" })
    .trim(),
  region: z
    .string()
    .min(1, { message: "Region is required" }),
  platform: z
    .string()
    .min(1, { message: "Platform is required" }),
  autoRegion: z
    .boolean()
    .default(true),
  covenantName: z
    .string()
    .min(1, { message: "Covenant name is required" }),
  preferredSessionName: z
    .string()
    .max(22, { message: "Session name must not be longer than 22 characters" })
    .optional(),
  preferredSessionPassword: z
    .string()
    .max(6, { message: "Session password must not be longer than 6 characters" })
    .optional(),
  preferredNightfarer: z
    .string()
    .optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function EditProfilePage() {
  return (
    <ProtectedRoute>
      <EditProfileContent />
    </ProtectedRoute>
  );
}

function EditProfileContent() {
  const router = useRouter()
  const { userData, refreshUserData } = useAuth()
  const [isLoadingUserData, setIsLoadingUserData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<NotificationType | null>(null)
  const [activeTab, setActiveTab] = useState("profile")
  
  // Debug: Log userData
  useEffect(() => {
    console.log("User data in profile edit:", userData);
    if (userData) {
      setIsLoadingUserData(false);
    }
  }, [userData]);
  
  // Character counter states
  const [displayNameLength, setDisplayNameLength] = useState(0)
  const [sessionNameLength, setSessionNameLength] = useState(0)
  const [sessionPasswordLength, setSessionPasswordLength] = useState(0)
  
  // Game data states from API
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [isLoadingGameData, setIsLoadingGameData] = useState(true)
  const [gameDataError, setGameDataError] = useState<string | null>(null)
  
  // Fetch game data from API
  useEffect(() => {
    const fetchGameData = async () => {
      // Only fetch if we haven't already
      if (!gameData && isLoadingGameData) {
        setGameDataError(null);
        
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
          const response = await fetch(`${apiBaseUrl}/api/v1/game-data`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch game data');
          }
          
          const data = await response.json();
          setGameData(data);
        } catch (error) {
          console.error('Error fetching game data:', error);
          setGameDataError('Could not load game data. Using default values.');
        } finally {
          setIsLoadingGameData(false);
        }
      }
    };
    
    fetchGameData();
  }, [gameData, isLoadingGameData]);
  
  // Use API data or fallback data
  const REGIONS = gameData?.regions?.map(r => r.description) || FALLBACK_REGIONS;
  const PLATFORMS = gameData?.platforms?.map(p => p.name) || FALLBACK_PLATFORMS;
  const COVENANT_NAMES = gameData?.covenants?.map(c => c.name) || FALLBACK_COVENANT_NAMES;
  
  // Memoize the select options to prevent unnecessary re-renders
  const regionOptions = React.useMemo(() => 
    REGIONS.map(region => (
      <SelectItem key={region} value={region}>
        {region}
      </SelectItem>
    )), 
    [REGIONS]
  );
  
  const platformOptions = React.useMemo(() => 
    PLATFORMS.map(platform => (
      <SelectItem key={platform} value={platform}>
        {platform}
      </SelectItem>
    )), 
    [PLATFORMS]
  );
  
  const covenantOptions = React.useMemo(() => 
    COVENANT_NAMES.map(covenant => (
      <SelectItem key={covenant} value={covenant}>
        {covenant}
      </SelectItem>
    )), 
    [COVENANT_NAMES]
  );
  
  // Debounce timer reference
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: userData?.username || "",
      email: userData?.email || "",
      displayName: userData?.displayName || "",
      region: userData?.region || REGIONS[0],
      platform: userData?.platform || PLATFORMS[0],
      autoRegion: userData?.autoRegion !== undefined ? userData.autoRegion : true,
      covenantName: userData?.covenantName || COVENANT_NAMES[0],
      preferredSessionName: "",
      preferredSessionPassword: "",
      preferredNightfarer: "",
    },
    mode: "onBlur", // Only validate on blur and submit for better UX
  })

  // Update form values when userData or gameData changes
  useEffect(() => {
    // Only reset the form when both user data is available and game data loading is complete
    if (userData && !isLoadingGameData) {
      form.reset({
        username: userData.username || "",
        email: userData.email || "",
        displayName: userData.displayName || "",
        region: userData.region || REGIONS[0],
        platform: userData.platform || PLATFORMS[0],
        autoRegion: userData.autoRegion !== undefined ? userData.autoRegion : true,
        covenantName: userData.covenantName || COVENANT_NAMES[0],
        preferredSessionName: userData.preferredSessionName || "",
        preferredSessionPassword: userData.preferredSessionPassword || "",
        preferredNightfarer: userData.preferredNightfarer || "",
      });
      
      // Update character counters
      setDisplayNameLength(userData.displayName?.length || 0);
      setSessionNameLength(userData.preferredSessionName?.length || 0);
      setSessionPasswordLength(userData.preferredSessionPassword?.length || 0);
    }
  }, [userData, isLoadingGameData, form]);
  
  // Show notification if there's an error loading game data
  useEffect(() => {
    if (gameDataError) {
      setNotification({
        message: gameDataError,
        type: 'warning'
      });
    }
  }, [gameDataError]);

  // Update character counters whenever fields change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'displayName' && value.displayName) {
        setDisplayNameLength(value.displayName.length);
      }
      if (name === 'preferredSessionName' && value.preferredSessionName) {
        setSessionNameLength(value.preferredSessionName.length);
      }
      if (name === 'preferredSessionPassword' && value.preferredSessionPassword) {
        setSessionPasswordLength(value.preferredSessionPassword.length);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Handle debounced validation
  const debouncedValidate = (fieldName: keyof ProfileFormValues) => {
    // Clear any existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    // Set a new timeout
    const timeout = setTimeout(() => {
      form.trigger(fieldName);
    }, 500); // 500ms debounce
    
    setValidationTimeout(timeout);
  };

  // Function to clear notification
  const clearNotification = () => {
    setNotification(null);
  };

  async function onSubmit(data: ProfileFormValues) {
    setIsSaving(true)
    setNotification(null)

    try {
      // Sanitize inputs before submission
      const sanitizedData = {
        username: data.username.trim().toLowerCase(),
        email: data.email.trim().toLowerCase(),
        displayName: data.displayName.trim(),
        region: data.region,
        platform: data.platform,
        autoRegion: data.autoRegion,
        covenantName: data.covenantName,
        preferredSessionName: data.preferredSessionName,
        preferredSessionPassword: data.preferredSessionPassword,
        preferredNightfarer: data.preferredNightfarer,
      };
      
      // Debug: Log what we're sending to the API
      console.log("Submitting profile data:", sanitizedData);
    
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sanitizedData),
      });

      const responseData = await response.json();
      
      // Debug: Log the response from the API
      console.log("Profile update response:", responseData);

      if (!response.ok) {
        // Parse the error response to get the specific message
        throw new Error(responseData.message || 'Failed to update profile');
      }

      // Refresh user data in the auth context
      await refreshUserData();
      
      // Debug: Log refreshed user data
      console.log("Refreshed user data:", userData);
      
      setNotification({
        message: "Profile updated successfully!",
        type: 'success'
      })
      setTimeout(() => {
        router.push('/profile');
      }, 1500); // Delay navigation slightly to show success message
    } catch (error: unknown) {
      setNotification({
        message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteProfile() {
    if (window.confirm("Are you sure you want to delete your profile? This action cannot be undone.")) {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const token = localStorage.getItem('token');
        
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
        
        setNotification({
          message: "Profile deleted successfully",
          type: 'success'
        })
        setTimeout(() => {
          router.push('/');
        }, 1500); // Delay navigation slightly to show success message
      } catch (error: unknown) {
        setNotification({
          message: error instanceof Error ? error.message : "Failed to delete profile",
          type: 'error'
        })
      }
    }
  }

  // Render loading state when user data is not yet loaded
  if (isLoadingUserData) {
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

  // Render main profile edit form when data is loaded
  return (
    <MainLayout footer={<Footer />}>
      <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto">
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Edit Profile</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Update your profile information
            </p>
          </div>

          {/* Notification display area */}
          <Notification 
            notification={notification} 
            onDismiss={clearNotification}
          />

          {/* Show loading spinner while game data is being fetched */}
          {isLoadingGameData ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading profile data...</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
                <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="profile">Profile Information</TabsTrigger>
                    <TabsTrigger value="settings">Personal Settings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="profile" className="space-y-6 pt-4">
                    {/* Basics Section */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-primary">Basics</h2>
                      
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base">Username</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} readOnly disabled className="bg-muted h-10" />
                            </FormControl>
                            <FormDescription className="text-xs md:text-sm">
                              Your username cannot be changed.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base">Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="email@example.com" 
                                type="email" 
                                {...field} 
                                className="h-10"
                                onChange={(e) => {
                                  field.onChange(e);
                                  debouncedValidate('email');
                                }}
                              />
                            </FormControl>
                            <FormDescription className="text-xs md:text-sm">
                              Your email address will be used for notifications and recovery.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel className="text-sm md:text-base">Display Name</FormLabel>
                              <span className={`text-xs ${displayNameLength > 8 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {displayNameLength} / 8
                              </span>
                            </div>
                            <FormControl>
                              <Input 
                                placeholder="Display Name" 
                                {...field} 
                                className="h-10"
                                onChange={(e) => {
                                  field.onChange(e);
                                  setDisplayNameLength(e.target.value.length);
                                  debouncedValidate('displayName');
                                }}
                              />
                            </FormControl>
                            <FormDescription className="text-xs md:text-sm">
                              3-8 characters. This is how other users will see you.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border"></div>

                    {/* Matchmaking Section */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-primary">Matchmaking</h2>
                      
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base">Region</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select your region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {regionOptions}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs md:text-sm">
                              Select your geographic region for matchmaking purposes.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base">Platform</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select your platform" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {platformOptions}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs md:text-sm">
                              Select your gaming platform.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="autoRegion"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm md:text-base">Auto Region Detection</FormLabel>
                              <FormDescription className="text-xs md:text-sm">
                                Allow automatic detection of your region based on your location.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border"></div>

                    {/* Fun Section */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-primary">Fun</h2>
                      
                      <FormField
                        control={form.control}
                        name="covenantName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base">Covenant Name</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select your covenant" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {covenantOptions}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs md:text-sm">
                              Choose your covenant allegiance.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-6 pt-4">
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-primary">Session Preferences</h2>
                      
                      <FormField
                        control={form.control}
                        name="preferredSessionName"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel className="text-sm md:text-base">Preferred Session Name</FormLabel>
                              <span className={`text-xs ${sessionNameLength > 22 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {sessionNameLength} / 22
                              </span>
                            </div>
                            <FormControl>
                              <Input 
                                placeholder="My Hunting Session" 
                                maxLength={22}
                                {...field}
                                className="h-10"
                                onChange={(e) => {
                                  field.onChange(e);
                                  setSessionNameLength(e.target.value.length);
                                  debouncedValidate('preferredSessionName');
                                }}
                              />
                            </FormControl>
                            <FormDescription className="text-xs md:text-sm">
                              Default name to use when creating new sessions.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="preferredSessionPassword"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel className="text-sm md:text-base">Preferred Session In-Game Password</FormLabel>
                              <span className={`text-xs ${sessionPasswordLength > 6 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {sessionPasswordLength} / 6
                              </span>
                            </div>
                            <FormControl>
                              <Input 
                                placeholder="Optional default password" 
                                type="text"
                                maxLength={6}
                                {...field}
                                className="h-10"
                                onChange={(e) => {
                                  field.onChange(e);
                                  setSessionPasswordLength(e.target.value.length);
                                  debouncedValidate('preferredSessionPassword');
                                }}
                              />
                            </FormControl>
                            <FormDescription className="text-xs md:text-sm">
                              Default password to use for your sessions.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-border"></div>
                    
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold text-primary">Game Preferences</h2>
                      
                      <FormField
                        control={form.control}
                        name="preferredNightfarer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm md:text-base">Preferred Nightfarer</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Character name" 
                                {...field}
                                className="h-10" 
                              />
                            </FormControl>
                            <FormDescription className="text-xs md:text-sm">
                              Your main character&apos;s name in the game.
                            </FormDescription>
                            <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.push('/profile')}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Danger Zone */}
          <div className="space-y-3 pt-4 md:pt-6">
            <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Once you delete your profile, there is no going back. Please be certain.
            </p>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProfile}
              className="w-full sm:w-auto"
            >
              Delete Profile
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
} 