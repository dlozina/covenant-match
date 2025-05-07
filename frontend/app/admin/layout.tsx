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
  X,
  Activity,
  Bug,
  Key
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Control sidebar visibility based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
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

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname]);

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
    { href: "/admin/news", icon: <Newspaper size={18} />, label: "News" },
    { href: "/admin/users", icon: <Users size={18} />, label: "Users" },
    { href: "/admin/sessions", icon: <Database size={18} />, label: "Sessions" },
    { href: "/admin/chat", icon: <MessageSquare size={18} />, label: "Chat Logs" },
    { href: "/admin/login-attempts", icon: <Key size={18} />, label: "Login Attempts" },
    { href: "/admin/realtime", icon: <Activity size={18} />, label: "Realtime Monitor" },
    { href: "/admin/bugs", icon: <Bug size={18} />, label: "Bug Reports" },
    { href: "/admin/settings", icon: <Settings size={18} />, label: "Settings" },
  ];

  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Mobile & tablet header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-sm border-b border-purple-900/20 z-40 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-purple-500/10 text-purple-500"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2 ml-3">
            <Shield className="h-5 w-5 text-purple-500" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
        </div>
        
        {/* Mobile logout button */}
        <button
          onClick={() => logout()}
          className="p-2 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          aria-label="Log out"
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Bottom mobile nav - Quick access to key areas */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-sm border-t border-purple-900/20 z-40 flex items-center justify-around px-2">
        <Link
          href="/admin"
          className={`p-2 rounded-md flex flex-col items-center justify-center ${
            pathname === "/admin" ? "text-purple-500" : "text-muted-foreground"
          }`}
        >
          <LayoutDashboard size={18} />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        <Link
          href="/admin/users"
          className={`p-2 rounded-md flex flex-col items-center justify-center ${
            pathname.startsWith("/admin/users") ? "text-purple-500" : "text-muted-foreground"
          }`}
        >
          <Users size={18} />
          <span className="text-xs mt-1">Users</span>
        </Link>
        <Link
          href="/admin/news"
          className={`p-2 rounded-md flex flex-col items-center justify-center ${
            pathname.startsWith("/admin/news") ? "text-purple-500" : "text-muted-foreground"
          }`}
        >
          <Newspaper size={18} />
          <span className="text-xs mt-1">News</span>
        </Link>
        <Link
          href="/admin/settings"
          className={`p-2 rounded-md flex flex-col items-center justify-center ${
            pathname.startsWith("/admin/settings") ? "text-purple-500" : "text-muted-foreground"
          }`}
        >
          <Settings size={18} />
          <span className="text-xs mt-1">Settings</span>
        </Link>
      </div>

      {/* Sidebar - with improved responsive behavior */}
      <aside className={`
        fixed inset-y-0 left-0 
        w-[280px] sm:w-72 
        bg-card/95 backdrop-blur-sm 
        border-r border-purple-900/20 
        z-50 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-0
        pt-0 lg:pt-0
        flex flex-col
      `}>
        {/* Sidebar header - only visible on desktop */}
        <div className="hidden lg:block p-4 border-b border-purple-900/20">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <span className="font-bold text-xl">Admin Panel</span>
          </div>
        </div>
        
        {/* Sidebar mobile close button */}
        <div className="lg:hidden flex justify-between items-center p-4 border-b border-purple-900/20">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-500" />
            <span className="font-bold text-lg">Menu</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md hover:bg-purple-500/10 text-muted-foreground"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-grow">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md w-full transition-colors ${
                  isActive ? 
                    "bg-purple-600/20 text-purple-200" : 
                    "hover:bg-purple-900/10 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Logout button at bottom - desktop only */}
        <div className="p-4 border-t border-purple-900/20 mt-auto hidden lg:block">
          <button
            onClick={() => logout()}
            className="flex items-center justify-center sm:justify-start gap-3 px-3 py-2.5 rounded-md w-full hover:bg-red-900/10 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
      
      {/* Overlay for mobile & tablet when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Main content */}
      <main className="flex-1 overflow-auto lg:pt-0 pt-14 pb-14 lg:pb-0">
        <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
} 