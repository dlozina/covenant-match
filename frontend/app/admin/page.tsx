"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Newspaper, 
  Server, 
  Clock, 
  Database, 
  ShieldCheck, 
  ActivitySquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock admin dashboard data
// This would be replaced with API calls to the backend
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

  useEffect(() => {
    // Mock API call - replace with actual API calls when ready
    const fetchDashboardData = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setStats({
        usersCount: 250,
        activeUsersCount: 120,
        totalSessions: 450,
        activeSessions: 15,
        completedSessions: 380,
        newsCount: 18,
        publishedNewsCount: 15
      });
      
      setSystemInfo({
        version: "1.0.0",
        environment: "production",
        uptime: "5d 12h 30m 15s",
        memoryUsage: {
          totalMb: 1024,
          usedMb: 512,
          freeMb: 512,
          usedPercent: 50
        },
        dbStatus: "OK",
        apiStatus: "OK"
      });
      
      setIsLoading(false);
    };
    
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
        <span className="ml-2">Loading dashboard data...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.usersCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsersCount} active users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <ActivitySquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalSessions} total sessions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">News Articles</CardTitle>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.newsCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.publishedNewsCount} published
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Sessions</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedSessions}</div>
            <p className="text-xs text-muted-foreground">
              {((stats?.completedSessions || 0) / (stats?.totalSessions || 1) * 100).toFixed(0)}% completion rate
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* System Information */}
      <h2 className="text-xl font-semibold mb-4">System Information</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Server Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span>{systemInfo?.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment:</span>
              <span className="capitalize">{systemInfo?.environment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime:</span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {systemInfo?.uptime}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Status:</span>
              <span className={`${systemInfo?.apiStatus === 'OK' ? 'text-green-500' : 'text-red-500'}`}>
                {systemInfo?.apiStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database Status:</span>
              <span className={`${systemInfo?.dbStatus === 'OK' ? 'text-green-500' : 'text-red-500'}`}>
                {systemInfo?.dbStatus}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 ml-2 text-muted-foreground">
                  {systemInfo?.memoryUsage.usedMb} MB used of {systemInfo?.memoryUsage.totalMb} MB total
                </span>
                <span className="font-medium">
                  {systemInfo?.memoryUsage.usedPercent}%
                </span>
              </div>
              
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-purple-500 transition-all`}
                  style={{ width: `${systemInfo?.memoryUsage.usedPercent || 0}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-card/50 p-2 rounded-md border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Used Memory</div>
                  <div className="text-lg font-medium">{systemInfo?.memoryUsage.usedMb} MB</div>
                </div>
                <div className="bg-card/50 p-2 rounded-md border border-border">
                  <div className="text-xs text-muted-foreground mb-1">Free Memory</div>
                  <div className="text-lg font-medium">{systemInfo?.memoryUsage.freeMb} MB</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 