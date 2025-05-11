"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes"
import { AuthProvider } from "@/lib/auth-context"
import { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Create a client with optimizations for WebSocket-first approach
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer since WebSockets handle updates
      refetchOnWindowFocus: true, // Still refetch on focus as fallback
      retry: 1, // Retry once if fetch fails
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when the component mounts, to ensure data is up to date
      // Prevent infinite error loops with improved retry delay
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      // Add better retry behavior for mutations too
      retry: 1,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}