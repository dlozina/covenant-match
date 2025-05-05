"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, UserPlus, Sword, Users, LayoutDashboard, User, LogOut, LogIn, Shield, Trophy, Bug } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
// Disabled change theme toggle for now
//import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, userData, logout, isLoading } = useAuth();
  
  const isAdmin = userData?.role === "admin";

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const routes = [
    {
      href: "/sessions",
      label: "Find Sessions",
      icon: <Users className="h-4 w-4 mr-2" />,
      active: pathname === "/sessions",
    },
    {
      href: "/sessions/user",
      label: "Your Sessions",
      icon: <Sword className="h-4 w-4 mr-2" />,
      active: pathname === "/sessions/user",
    },
    {
      href: "/leaderboard",
      label: "Leaderboard",
      icon: <Trophy className="h-4 w-4 mr-2" />,
      active: pathname === "/leaderboard",
    },
    ...(isLoggedIn ? [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
        active: pathname === "/dashboard",
      }
    ] : [])
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-accent/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Full-width flex container with height */}
      <div className="w-full flex h-16 px-4 sm:px-6 lg:px-8 justify-between items-center">
        {/* Left section: Logo and navigation */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative h-8 w-8 overflow-hidden">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 
                group-hover:from-purple-600 group-hover:to-indigo-800 transition-all duration-200 
                glow-sm"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sword className="h-5 w-5 text-white" />
              </div>
            </div>
            <span className="inline-block font-bold text-xl tracking-tight bg-clip-text text-transparent 
              bg-gradient-to-r from-purple-400 to-indigo-300">
              Covenant Match
            </span>
          </Link>
          <nav className="hidden md:flex md:ml-10 gap-6">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-purple-400",
                  route.active 
                    ? "text-foreground after:content-[''] after:block after:w-full after:h-0.5 after:bg-purple-500 after:absolute after:bottom-0 after:left-0 relative" 
                    : "text-muted-foreground"
                )}
              >
                {route.icon}
                {route.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right section: buttons */}
        <div className="flex items-center gap-2">
          {!isLoading && (
            <>
              {isLoggedIn && userData ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="flex items-center gap-2 hover:bg-purple-500/10 hover:text-purple-400 transition-all"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-purple-700 to-indigo-900 text-white text-xs">
                            {userData.displayName?.substring(0, 2) || userData.username?.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline font-medium">{userData.displayName || userData.username}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="w-full flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile/edit" className="w-full flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/friends" className="w-full flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Friends
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="w-full flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href="/bug" className="w-full flex items-center">
                          <Bug className="h-4 w-4 mr-2" />
                          Report Bug
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between mb-1">
                          <span>Platform:</span>
                          <span className="font-medium">{userData.platform}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Region:</span>
                          <span className="font-medium">{userData.autoRegion ? userData.cmRegion : userData.region}</span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="w-full flex items-center text-red-500 focus:text-red-500">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50 transition-all"
                    asChild
                  >
                    <Link href="/login" className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      <span className="hidden sm:inline">Login</span>
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50 transition-all"
                    asChild
                  >
                    <Link href="/profile/create" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Create Profile</span>
                    </Link>
                  </Button>
                </>
              )}
            </>
          )}
          {/* Change theme toggle to be on the right side of the header */}
          {/* <ThemeToggle /> */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-accent hover:text-accent-foreground"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {routes.map((route) => (
                  <DropdownMenuItem key={route.href} asChild>
                    <Link
                      href={route.href}
                      className={cn(
                        "w-full flex items-center",
                        route.active && "font-medium text-purple-400"
                      )}
                    >
                      {route.icon}
                      {route.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {!isLoggedIn && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/login" className="w-full flex items-center">
                        <LogIn className="h-4 w-4 mr-2" />
                        Login
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/create" className="w-full flex items-center">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Profile
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isLoggedIn && (
                  <DropdownMenuItem onClick={handleLogout} className="w-full flex items-center text-red-500 focus:text-red-500">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}