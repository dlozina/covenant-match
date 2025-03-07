#!/bin/bash

cd frontend

# Continue with the SiteHeader.tsx file
cat > components/layout/SiteHeader.tsx << 'EOF'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const routes = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
    },
    {
      href: "/sessions",
      label: "Find Sessions",
      active: pathname === "/sessions",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard",
    },
    {
      href: "/profile",
      label: "Profile",
      active: pathname === "/profile",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold text-xl">CovenantMatch</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  route.active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
            {isMenuOpen && (
              <div className="absolute top-16 right-0 w-full bg-background border-b md:hidden">
                <div className="flex flex-col space-y-4 p-4">
                  {routes.map((route) => (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={cn(
                        "text-sm font-medium transition-colors hover:text-primary",
                        route.active ? "text-foreground" : "text-muted-foreground"
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {route.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
EOF

# Update the SessionCard component to use shadcn/ui components
cat > components/session/SessionCard.tsx << 'EOF'
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GameSession } from "@/types";
import { timeAgo } from "@/lib/utils";
import { UserCircle2 } from "lucide-react";

interface SessionCardProps {
  session: GameSession;
  onJoin: (sessionId: string) => void;
}

export function SessionCard({ session, onJoin }: SessionCardProps) {
  const playerCount = session.joinedPlayers.length;
  const maxPlayers = 3;
  const isJoinable = playerCount < maxPlayers && session.status === 'open';
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle2 className="h-5 w-5" />
          {session.joinedPlayers[0]?.username || "Unknown"}'s Session
        </CardTitle>
        <CardDescription>
          Created {timeAgo(session.createdAt)} • {playerCount}/{maxPlayers} players
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Host Character:</span>
            <span className="text-sm">{session.character}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <span className="text-sm capitalize">{session.status.replace('_', ' ')}</span>
          </div>
          {session.joinedPlayers.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Players:</h4>
              <div className="space-y-1">
                {session.joinedPlayers.map((player) => (
                  <div key={player.userId} className="text-sm flex justify-between">
                    <span>{player.username}</span>
                    <span>{player.character}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onJoin(session.id)} 
          disabled={!isJoinable}
          className="w-full"
          variant={isJoinable ? "default" : "secondary"}
        >
          {isJoinable ? "Join Session" : session.status === 'full' ? "Session Full" : "Session Unavailable"}
        </Button>
      </CardFooter>
    </Card>
  );
}
EOF

# Create an Avatar component
cat > components/ui/avatar.tsx << 'EOF'
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
EOF

# Create a Badge component
cat > components/ui/badge.tsx << 'EOF'
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
EOF

# Create a Input component
cat > components/ui/input.tsx << 'EOF'
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
EOF

# Create a Label component
cat > components/ui/label.tsx << 'EOF'
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
EOF

# Update the package.json to install required dependencies
cat > package.json << 'EOF'
{
  "name": "covenant-match-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.358.0",
    "next": "14.1.4",
    "next-themes": "^0.3.0",
    "react": "^18",
    "react-dom": "^18",
    "react-hook-form": "^7.51.0",
    "swr": "^2.2.5",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.1.4",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
EOF

# Create components.json for shadcn/ui CLI
cat > components.json << 'EOF'
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
EOF

# Modify the home page to use shadcn/ui components
cat > app/page.tsx << 'EOF'
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-6">Welcome to CovenantMatch</h1>
        <p className="text-xl mb-8 text-muted-foreground">Find teammates, create game sessions, and track your Nightreign statistics.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">Find Sessions</h2>
            <p className="mb-4 text-muted-foreground">Join other players looking for teammates and start playing immediately.</p>
            <Button asChild>
              <Link href="/sessions">Browse Sessions</Link>
            </Button>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">Create Session</h2>
            <p className="mb-4 text-muted-foreground">Host a new game session and invite other players to join you.</p>
            <Button asChild>
              <Link href="/sessions/create">Create Session</Link>
            </Button>
          </div>
        </div>
        
        <div className="bg-muted p-6 rounded-lg mt-8">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Matchmaking with other Nightreign players</li>
            <li>Secure password sharing for game sessions</li>
            <li>Track your game statistics and achievements</li>
            <li>Build your reputation through fair play and accurate reporting</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
EOF

# Update sessions page
cat > app/sessions/page.tsx << 'EOF'
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SessionsPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Available Sessions</h1>
      <p className="mb-8 text-muted-foreground">Join a session or create your own to start playing with other Nightreign enthusiasts.</p>
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Looking for a session?</h2>
        </div>
        <Button asChild>
          <Link href="/sessions/create">Create Session</Link>
        </Button>
      </div>
      
      <div className="grid gap-4">
        <div className="p-4 border rounded-lg shadow-sm bg-card">
          <p className="text-lg font-medium">No active sessions available.</p>
          <p className="text-muted-foreground">Be the first to create a new session!</p>
        </div>
      </div>
    </div>
  );
}
EOF

# Create a README explaining the transition from Radix UI to shadcn/ui
cat > shadcn-ui-migration.md << 'EOF'
# Migration from Radix UI to shadcn/ui

This project has been migrated from using Radix UI directly to using shadcn/ui. Here's an overview of the changes:

## What is shadcn/ui?

shadcn/ui is a collection of reusable components built using Radix UI and Tailwind CSS. Unlike Radix UI which is a headless component library, shadcn/ui provides both the functionality and styling.

## Key differences

1. **Component ownership**: shadcn/ui components are copied into your project rather than being installed as dependencies.
2. **Styling**: shadcn/ui comes with a beautiful design system out of the box using Tailwind CSS.
3. **Theme support**: Built-in dark mode and theme customization.

## Components migrated

- Button
- Card
- Avatar
- Badge
- Input
- Label
- Dropdown Menu
- Theme Toggle

## Using shadcn/ui CLI

To add new components, you can use the shadcn/ui CLI:

```bash
npx shadcn-ui@latest add [component-name]
```

For example, to add a dialog component:

```bash
npx shadcn-ui@latest add dialog
```

## Customizing themes

The theme is configured in `app/globals.css` using CSS variables. You can modify these variables to match your brand colors.

## Further documentation

For more information about shadcn/ui, visit [https://ui.shadcn.com](https://ui.shadcn.com).
EOF

echo "Migration from Radix UI to shadcn/ui completed successfully."
cd ..
