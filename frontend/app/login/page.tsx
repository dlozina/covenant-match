"use client"

import { useState, useEffect, useRef } from "react"
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
import { AlertCircle } from "lucide-react"
import { login as apiLogin, LoginParams } from "@/utils/api"
import Script from "next/script"

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
  const [notification, setNotification] = useState<NotificationType | null>(null)
  // Store form values to prevent losing them on re-render
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  // Reference to the form element
  const formRef = useRef<HTMLFormElement>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: username,
      password: password,
    },
    mode: "onSubmit", // Only validate on submit
  })

  // Update the form when username/password state changes
  useEffect(() => {
    form.setValue("username", username);
    form.setValue("password", password);
  }, [username, form]);

  // Reset Turnstile when needed
  const resetTurnstile = () => {
    // Reset the Turnstile widget if available
    if (window.turnstile) {
      window.turnstile.reset();
    }
  };

  async function onSubmit(data: LoginFormValues) {
    // Save form values to state
    setUsername(data.username);
    
    // Reset notification on new submission
    setNotification(null);
    
    // Check if we're currently locked out
    if (isLocked) {
      setNotification({
        message: "Too many login attempts. Please try again later.",
        type: 'error'
      });
      return;
    }

    // Get turnstile token directly from the DOM
    const turnstileResponse = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement;
    const turnstileToken = turnstileResponse?.value;
    
    // Check if Turnstile token is available
    if (!turnstileToken) {
      setNotification({
        message: "Please complete the CAPTCHA verification.",
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    // Increment login attempts
    setLoginAttempts(prev => prev + 1);

    // If we've had too many attempts, lock the form temporarily
    if (loginAttempts >= 5) {
      setIsLocked(true);
      setTimeout(() => {
        setIsLocked(false);
        setLoginAttempts(0);
      }, 60000); // Lock for 1 minute after 5 attempts
      
      setNotification({
        message: "Too many failed login attempts. Please try again in 1 minute.",
        type: 'error'
      });
      setIsLoading(false);
      return;
    }

    try {
      // Prepare login data with turnstile token
      const loginData: LoginParams = {
        username: data.username.trim().toLowerCase(),
        password: data.password, // passwords should not be modified
        turnstileToken: turnstileToken,
      };
      
      // First attempt to get a token from the API
      const responseData = await apiLogin(loginData);
      
      if (!responseData || !responseData.token) {
        throw new Error('Authentication failed');
      }
      
      // Then attempt to login with the token
      try {
        await login(responseData.token);
        
        // If we get here, login was successful
        setNotification({
          message: "Login successful!",
          type: 'success'
        });
        
        // Reset login attempts and turnstile on successful login
        setLoginAttempts(0);
        resetTurnstile();
        
        // Clear password for security
        setPassword("");
        
        // Wait a moment to show success message before redirecting
        setTimeout(() => {
          router.push('/');
        }, 500);
      } catch (loginError) {
        // Clear the password field on error
        setPassword("");
        resetTurnstile();
        
        // Handle specific disabled account error
        if (loginError instanceof Error) {
          setNotification({
            message: loginError.message,
            type: 'error'
          });
          console.error('Login error:', loginError);
        } else {
          setNotification({
            message: "An unknown error occurred during login.",
            type: 'error'
          });
        }
      }
    } catch (apiError) {
      // Clear the password field on error
      setPassword("");
      resetTurnstile();
      
      setNotification({
        message: apiError instanceof Error ? apiError.message : "Login failed. Please try again.",
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
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
            {/* Add Turnstile script */}
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js"
              async
              defer
            />
            
            <Form {...form}>
              <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="username" 
                          {...field} 
                          className="h-10 text-base"
                          onChange={(e) => {
                            field.onChange(e);
                            setUsername(e.target.value);
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
                            setPassword(e.target.value);
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
                
                {/* Turnstile widget */}
                <div className="flex justify-center">
                  <div
                    className="cf-turnstile"
                    data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-10 text-sm sm:text-base" 
                  disabled={isLoading || isLocked}
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

// Add this interface for TypeScript
declare global {
  interface Window {
    turnstile?: {
      reset: () => void;
    };
  }
}