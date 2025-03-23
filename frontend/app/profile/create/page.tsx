"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { MainLayout } from "@/components/layout"
import { Footer } from "@/components/layout/Footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
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
import { Notification, NotificationType } from "@/components/ui/notification"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

// Username and display name validation regex
const usernameRegex = /^[a-zA-Z0-9_.-]+$/;

// Region options
const REGIONS = [
  "North America",
  "Europe",
  "Asia",
  "Oceania",
  "South America",
  "Africa",
  "Middle East",
]

// Covenant name options
const COVENANT_NAMES = [
  "Nightfarer",
  "Shadowkeeper",
  "Bloodstalker",
  "Duskwalker",
  "Moonhunter",
  "Soulreaper",
  "Veilwatcher",
]

// Validation schema with consistent rules
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
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password too long" })
    .trim()
    .refine(val => /[0-9]/.test(val), {
      message: "Password must contain at least one number"
    })
    .refine(val => /[^a-zA-Z0-9]/.test(val), {
      message: "Password must contain at least one special character"
    })
    .refine(val => val === val.trim(), {
      message: "Password cannot contain leading or trailing whitespace"
    }),
  displayName: z
    .string()
    .min(3, { message: "Display name must be at least 3 characters" })
    .max(8, { message: "Display name must not be longer than 8 characters" })
    .trim(),
  region: z
    .string()
    .min(1, { message: "Region is required" }),
  autoRegion: z
    .boolean()
    .default(true),
  covenantName: z
    .string()
    .min(1, { message: "Covenant name is required" }),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function CreateProfilePage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<NotificationType | null>(null)
  
  // Character counter states
  const [usernameLength, setUsernameLength] = useState(0)
  const [displayNameLength, setDisplayNameLength] = useState(0)
  
  // Debounce timer references
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      displayName: "",
      region: REGIONS[0],
      autoRegion: true,
      covenantName: COVENANT_NAMES[0],
    },
    mode: "onBlur",  // Only validate on blur and submit for better UX
  })

  // Update character counters whenever field values change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'username' && value.username) {
        setUsernameLength(value.username.length);
      }
      if (name === 'displayName' && value.displayName) {
        setDisplayNameLength(value.displayName.length);
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
    setIsLoading(true)
    setNotification(null)

    try {
      // Sanitize inputs before submission
      const sanitizedData = {
        username: data.username.trim().toLowerCase(),
        email: data.email.trim().toLowerCase(),
        password: data.password, // passwords should not be modified
        displayName: data.displayName.trim(),
        region: data.region,
        autoRegion: data.autoRegion,
        covenantName: data.covenantName,
      };
    
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/v1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to create profile')
      }

      // Parse the response to get the token
      const responseData = await response.json()
      
      // Use the login function from auth context
      if (responseData.token) {
        login(responseData.token)
        setNotification({
          message: "Profile created successfully!",
          type: 'success'
        })
        router.push('/profile')
      } else {
        // If no token is returned, redirect to login
        setNotification({
          message: "Profile created successfully! Please log in.",
          type: 'success'
        })
        router.push('/login')
      }
    } catch (error: unknown) {
      setNotification({
        message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout footer={<Footer />}>
      <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto">
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Create Profile</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Fill in your details to create your profile
            </p>
          </div>

          {/* Notification display area */}
          <Notification 
            notification={notification} 
            onDismiss={clearNotification}
          />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
              {/* Basics Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-primary">Basics</h2>
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-sm md:text-base">Username</FormLabel>
                        <span className={`text-xs ${usernameLength > 8 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {usernameLength} / 8
                        </span>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="username" 
                          {...field} 
                          className="h-10" 
                          onChange={(e) => {
                            field.onChange(e);
                            setUsernameLength(e.target.value.length);
                            debouncedValidate('username');
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs md:text-sm">
                        3-8 characters, can contain letters, numbers, underscores, dots, and hyphens.
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="********" 
                          type="password" 
                          {...field} 
                          className="h-10"
                          onChange={(e) => {
                            field.onChange(e);
                            debouncedValidate('password');
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-xs md:text-sm">
                        Choose a strong password with at least 8 characters, one number, and one special character.
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select your region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGIONS.map((region) => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select your covenant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COVENANT_NAMES.map((covenant) => (
                            <SelectItem key={covenant} value={covenant}>
                              {covenant}
                            </SelectItem>
                          ))}
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

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full md:w-auto h-10 mt-6"
              >
                {isLoading ? "Creating..." : "Create Profile"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </MainLayout>
  )
} 