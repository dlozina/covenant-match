"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Newspaper, 
  Users, 
  LayoutDashboard, 
  Settings, 
  LogOut,
  Database,
  MessageSquare,
  Shield,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isLoading, userData, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Control sidebar visibility based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Debug logging
    console.log('Admin Layout - Auth state:', { 
      isLoading, 
      isLoggedIn, 
      userRole: userData?.role,
      isAdmin: userData?.role === 'admin'
    });
    
    // Redirect non-admin users or not logged in users
    if (!isLoading && (!isLoggedIn || userData?.role !== "admin")) {
      console.log('Redirecting from admin panel - Not authorized');
      router.push("/");
    }
  }, [isLoading, isLoggedIn, userData, router]);

  // Show loading state while checking auth
  if (isLoading || !isLoggedIn || userData?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Admin navigation items
  const navItems = [
    { href: "/admin", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { href: "/admin/users", icon: <Users size={18} />, label: "Users" },
    { href: "/admin/news", icon: <Newspaper size={18} />, label: "News" },
    { href: "/admin/sessions", icon: <Database size={18} />, label: "Sessions" },
    { href: "/admin/chat", icon: <MessageSquare size={18} />, label: "Chat Logs" },
    { href: "/admin/settings", icon: <Settings size={18} />, label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Mobile menu button */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-purple-500/10 text-purple-500"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar - with responsive behavior */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        fixed md:relative w-64 border-r border-purple-900/20 bg-card/95 backdrop-blur-sm 
        min-h-screen z-40 transition-transform duration-300 ease-in-out md:translate-x-0`}>
        <div className="p-4 border-b border-purple-900/20">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <span className="font-bold text-xl">Admin Panel</span>
          </div>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md w-full transition-colors ${
                  isActive ? 
                    "bg-purple-600/20 text-purple-200" : 
                    "hover:bg-purple-900/10 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2 rounded-md w-full hover:bg-red-900/10 text-muted-foreground hover:text-red-400 mt-4 transition-colors"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </nav>
      </aside>
      
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container p-3 sm:p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
} 