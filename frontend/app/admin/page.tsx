"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Newspaper, 
  Server, 
  Clock, 
  ShieldCheck, 
  ActivitySquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

// Dashboard data types from backend
interface DashboardStats {
  usersCount: number;
  activeUsersCount: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  newsCount: number;
  publishedNewsCount: number;
}

interface SystemInfo {
  version: string;
  environment: string;
  uptime: string;
  memoryUsage: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    usedPercent: number;
  };
  dbStatus: string;
  apiStatus: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData, getAuthHeaders } = useAuth();

  useEffect(() => {
    // Debug log
    console.log("Admin Dashboard - User Data:", userData);
    
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const headers = await getAuthHeaders();
        
        // Fetch dashboard stats
        const statsResponse = await fetch('/api/v1/admin/dashboard', {
          headers
        });
        
        if (!statsResponse.ok) {
          throw new Error(`Failed to fetch dashboard stats: ${statsResponse.status}`);
        }
        
        const statsData = await statsResponse.json();
        console.log("Received stats data:", statsData);
        
        // Validate stats data
        if (!statsData || typeof statsData !== 'object') {
          console.error("Invalid stats data format:", statsData);
          setStats(null);
        } else {
          // Ensure all properties exist with defaults
          setStats({
            usersCount: Number(statsData.usersCount) || 0,
            activeUsersCount: Number(statsData.activeUsersCount) || 0,
            totalSessions: Number(statsData.totalSessions) || 0,
            activeSessions: Number(statsData.activeSessions) || 0,
            completedSessions: Number(statsData.completedSessions) || 0,
            newsCount: Number(statsData.newsCount) || 0,
            publishedNewsCount: Number(statsData.publishedNewsCount) || 0
          });
        }
        
        // Fetch system info
        const sysInfoResponse = await fetch('/api/v1/admin/system-info', {
          headers
        });
        
        if (!sysInfoResponse.ok) {
          throw new Error(`Failed to fetch system info: ${sysInfoResponse.status}`);
        }
        
        const sysInfoData = await sysInfoResponse.json();
        console.log("Received system info data:", sysInfoData);
        
        // Validate system info data
        if (!sysInfoData || typeof sysInfoData !== 'object') {
          console.error("Invalid system info data format:", sysInfoData);
          setSystemInfo(null);
        } else {
          // Create a normalized system info object with all required fields
          setSystemInfo({
            version: sysInfoData.version || 'Unknown',
            environment: sysInfoData.environment || 'Unknown',
            uptime: sysInfoData.uptime || 'Unknown',
            memoryUsage: {
              totalMb: Number(sysInfoData.memoryUsage?.totalMb) || 0,
              usedMb: Number(sysInfoData.memoryUsage?.usedMb) || 0,
              freeMb: Number(sysInfoData.memoryUsage?.freeMb) || 0,
              usedPercent: Number(sysInfoData.memoryUsage?.usedPercent) || 0
            },
            dbStatus: sysInfoData.dbStatus || 'Unknown',
            apiStatus: sysInfoData.apiStatus || 'Unknown'
          });
        }
      } catch (err) {
        console.error("Error fetching admin data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userData?.role === 'admin') {
      fetchDashboardData();
    } else {
      setError("You don't have permission to access this page");
      setIsLoading(false);
    }
  }, [userData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
        <span className="ml-2">Loading dashboard data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h3 className="text-lg font-medium mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">Admin Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-2xl font-bold">{stats?.usersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsersCount || 0} active users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <ActivitySquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalSessions || 0} total sessions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-sm font-medium">News Articles</CardTitle>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-2xl font-bold">{stats?.newsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.publishedNewsCount || 0} published
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-4">
            <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-2xl font-bold">{stats?.completedSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {((stats?.completedSessions || 0) / (stats?.totalSessions || 1) * 100).toFixed(0)}% completion rate
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* System Information */}
      <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">System Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-base md:text-lg font-medium">Server Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-4 pt-0 md:pt-0">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span>{systemInfo?.version || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment:</span>
              <span className="capitalize">{systemInfo?.environment || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime:</span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {systemInfo?.uptime || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Status:</span>
              <span className={`${systemInfo?.apiStatus === 'OK' ? 'text-green-500' : 'text-red-500'}`}>
                {systemInfo?.apiStatus || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database Status:</span>
              <span className={`${systemInfo?.dbStatus === 'OK' ? 'text-green-500' : 'text-red-500'}`}>
                {systemInfo?.dbStatus || 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-base md:text-lg font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 ml-2 text-muted-foreground text-xs md:text-sm">
                  {systemInfo?.memoryUsage?.usedMb ?? 0} MB used of {systemInfo?.memoryUsage?.totalMb ?? 0} MB total
                </span>
                <span className="font-medium">
                  {systemInfo?.memoryUsage?.usedPercent ?? 0}%
                </span>
              </div>
              
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-purple-500 transition-all`}
                  style={{ width: `${systemInfo?.memoryUsage?.usedPercent ?? 0}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 md:gap-4 pt-2">
                <div className="bg-card/50 p-2 rounded-md border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Used Memory</div>
                  <div className="text-base md:text-lg font-medium">{systemInfo?.memoryUsage?.usedMb ?? 0} MB</div>
                </div>
                <div className="bg-card/50 p-2 rounded-md border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Free Memory</div>
                  <div className="text-base md:text-lg font-medium">{systemInfo?.memoryUsage?.freeMb ?? 0} MB</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 