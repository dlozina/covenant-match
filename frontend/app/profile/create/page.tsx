"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { AlertCircle } from "lucide-react"
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

// Type for our notification state
type NotificationType = {
  message: string;
  type: 'error' | 'success' | 'warning';
}

// Username and display name validation regex
const usernameRegex = /^[a-zA-Z0-9_.-]+$/;

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
    .max(100, { message: "Password too long" }),
  displayName: z
    .string()
    .min(3, { message: "Display name must be at least 3 characters" })
    .max(8, { message: "Display name must not be longer than 8 characters" })
    .trim(),
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

  async function onSubmit(data: ProfileFormValues) {
    setIsLoading(true)
    setNotification(null)

    try {
      // Sanitize inputs before submission
      const sanitizedData = {
        username: data.username.trim().toLowerCase(),
        email: data.email.trim().toLowerCase(),
        password: data.password, // passwords should not be modified
        displayName: data.displayName.trim()
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
          {notification && (
            <div className={`
              flex items-center gap-2 text-sm p-2 rounded-md 
              ${notification.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 
               notification.type === 'warning' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
               'bg-green-50 text-green-600 border border-green-200'}
            `}>
              <AlertCircle size={16} />
              <span>{notification.message}</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
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
                    <FormMessage className="text-xs md:text-sm" />
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
                    <FormMessage className="text-xs md:text-sm" />
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
                      Choose a strong password with at least 8 characters.
                    </FormDescription>
                    <FormMessage className="text-xs md:text-sm" />
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
                    <FormMessage className="text-xs md:text-sm" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full md:w-auto h-10 mt-2"
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