"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserPlus, Sword, Users, LayoutDashboard, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/",
      label: "Home",
      icon: <Sword className="h-4 w-4 mr-2" />,
      active: pathname === "/",
    },
    {
      href: "/sessions",
      label: "Find Sessions",
      icon: <Users className="h-4 w-4 mr-2" />,
      active: pathname === "/sessions",
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
      active: pathname === "/dashboard",
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="h-4 w-4 mr-2" />,
      active: pathname === "/profile",
    },
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
              CovenantMatch
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
          <Button 
            variant="outline" 
            size="sm" 
            className="hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50 transition-all"
            asChild
          >
            <Link href="/create-profile" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Profile</span>
            </Link>
          </Button>
          <ThemeToggle />
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
                <DropdownMenuItem asChild>
                  <Link href="/create-profile" className="w-full flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}