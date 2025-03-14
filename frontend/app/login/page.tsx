"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { MainLayout } from "@/components/layout"
import { Footer } from "@/components/layout/Footer"

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

const loginFormSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Invalid username or password')
      }

      const responseData = await response.json()
      
      // Store the token in localStorage
      if (responseData.token) {
        localStorage.setItem('token', responseData.token)
        toast.success("Login successful!")
        router.push('/profile')
      } else {
        throw new Error('Authentication failed')
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
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
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-10 text-sm sm:text-base" 
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center space-y-2 px-4 sm:px-6 pb-6">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/create-profile" className="text-primary hover:underline">
                Create one
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  )
} 