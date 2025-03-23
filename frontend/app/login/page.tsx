"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Link from "next/link"
import { MainLayout } from "@/components/layout"
import { Footer } from "@/components/layout/Footer"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import ReCaptchaComponent from "@/components/auth/ReCaptcha"
import { AlertCircle } from "lucide-react"

// Username validation regex - must match the one used in profile creation
const usernameRegex = /^[a-zA-Z0-9_.-]+$/;

const loginFormSchema = z.object({
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(8, { message: "Username cannot exceed 8 characters" })
    .trim()
    .refine(val => usernameRegex.test(val), {
      message: "Username can only contain letters, numbers, underscores, dots, and hyphens"
    }),
  password: z.string()
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
})

type LoginFormValues = z.infer<typeof loginFormSchema>

// Type for our notification state
type NotificationType = {
  message: string;
  type: 'error' | 'success' | 'warning';
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [notification, setNotification] = useState<NotificationType | null>(null)
  
  // Character counter state
  const [usernameLength, setUsernameLength] = useState(0)
  
  // Debounce timer reference
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
    mode: "onBlur", // Only validate on blur and submit for better UX
  })

  // Update character counter whenever field value changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'username' && value.username) {
        setUsernameLength(value.username.length);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Handle debounced validation
  const debouncedValidate = (fieldName: keyof LoginFormValues) => {
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

  // Show CAPTCHA after 3 failed attempts
  useEffect(() => {
    if (loginAttempts >= 3) {
      setShowCaptcha(true)
    }
  }, [loginAttempts])

  async function onSubmit(data: LoginFormValues) {
    // Reset notification on new submission
    setNotification(null)
    
    // Check if we're currently locked out
    if (isLocked) {
      setNotification({
        message: "Too many login attempts. Please try again later.",
        type: 'error'
      })
      return
    }

    // Check if captcha is shown but not completed
    if (showCaptcha && !captchaToken) {
      setNotification({
        message: "Please complete the CAPTCHA verification",
        type: 'warning'
      })
      return
    }

    setIsLoading(true)
    // Increment login attempts
    setLoginAttempts(prev => prev + 1)

    // If we've had too many attempts, lock the form temporarily
    if (loginAttempts >= 5) {
      setIsLocked(true)
      setTimeout(() => {
        setIsLocked(false)
        setLoginAttempts(0)
      }, 60000) // Lock for 1 minute after 5 attempts
      
      setNotification({
        message: "Too many failed login attempts. Please try again in 1 minute.",
        type: 'error'
      })
      setIsLoading(false)
      return
    }

    try {
      // Sanitize inputs before submission
      const sanitizedData: {
        username: string;
        password: string;
        captchaToken?: string;
      } = {
        username: data.username.trim().toLowerCase(),
        password: data.password // passwords should not be modified
      };
      
      // Add captcha token if available
      if (captchaToken) {
        sanitizedData.captchaToken = captchaToken
      }
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
        credentials: 'include', // Include cookies for CSRF protection
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Check if server requires CAPTCHA
        if (errorData.requiresCaptcha) {
          setShowCaptcha(true)
          throw new Error(errorData.message || 'CAPTCHA verification required')
        }
        
        throw new Error(errorData.message || 'Invalid username or password')
      }

      const responseData = await response.json()
      
      // Use the login function from auth context
      if (responseData.token) {
        login(responseData.token)
        setNotification({
          message: "Login successful!",
          type: 'success'
        })
        // Reset login attempts and captcha on successful login
        setLoginAttempts(0)
        setShowCaptcha(false)
        setCaptchaToken(null)
        router.push('/profile')
      } else {
        throw new Error('Authentication failed')
      }
    } catch (error: unknown) {
      setNotification({
        message: error instanceof Error ? error.message : "Login failed. Please try again.",
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle captcha change
  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token)
  }

  return (
    <MainLayout footer={<Footer />}>
      <div className="container flex items-center justify-center min-h-[80vh] px-4 py-6 md:py-8">
        <Card className="w-full max-w-sm mx-auto">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-bold">Login</CardTitle>
            <CardDescription className="text-sm">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-sm">Username</FormLabel>
                        <span className={`text-xs ${usernameLength > 8 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {usernameLength} / 8
                        </span>
                      </div>
                      <FormControl>
                        <Input 
                          placeholder="username" 
                          {...field} 
                          className="h-10 text-base"
                          onChange={(e) => {
                            field.onChange(e);
                            setUsernameLength(e.target.value.length);
                            debouncedValidate('username');
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="********" 
                          type="password" 
                          {...field} 
                          className="h-10 text-base"
                          onChange={(e) => {
                            field.onChange(e);
                            debouncedValidate('password');
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                    </FormItem>
                  )}
                />

                {/* Notification display area */}
                {notification && (
                  <div className={`
                    flex items-center gap-2 text-sm p-3 rounded-md 
                    ${notification.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 
                     notification.type === 'warning' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                     'bg-green-100 text-green-700 border border-green-300'}
                  `}>
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{notification.message}</span>
                  </div>
                )}

                {/* Show captcha if needed */}
                {showCaptcha && (
                  <div className="mt-4">
                    <p className="text-sm text-amber-600 mb-2">Security verification required</p>
                    <ReCaptchaComponent 
                      onChange={handleCaptchaChange}
                      onExpired={() => setCaptchaToken(null)}
                    />
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-10 text-sm sm:text-base" 
                  disabled={isLoading || isLocked || (showCaptcha && !captchaToken)}
                >
                  {isLoading ? "Logging in..." : isLocked ? "Temporarily locked" : "Login"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center space-y-2 px-4 sm:px-6 pb-6">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/profile/create" className="text-primary hover:underline">
                Create one
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  )
} 