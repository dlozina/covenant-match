"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import { Notification, NotificationType } from "@/components/ui/notification";
import { useAuth } from "@/lib/auth-context";
import { ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";

interface ConnectionsPerHourInfo {
  hour: string;
  count: number;
}

interface SessionConnectionInfo {
  sessionId: string;
  count: number;
}

interface ActorMailboxInfo {
  actor: string;
  rate: number;
}

interface ConnectionStats {
  currentConnections: number;
  totalConnectionsToday: number;
  totalMessages: number;
  connectionsPerHour: ConnectionsPerHourInfo[];
  sessionConnections: SessionConnectionInfo[];
  mailboxSizes: ActorMailboxInfo[];
  messageRates: ActorMailboxInfo[];
  actorCount: number;
}

interface WebSocketStatsResponse {
  status: string;
  data: {
    stats: ConnectionStats;
  };
}

export default function RealtimeMonitorPage() {
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const { fetchWithAuth } = useAuth();
  
  const clearNotification = () => setNotification(null);
  
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const response = await fetchWithAuth('/api/v1/admin/websocket-stats');
      const data = response as WebSocketStatsResponse;
      
      if (data.status === "success" && data.data && data.data.stats) {
        setStats(data.data.stats);
      } else {
        throw new Error("Invalid response format");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error fetching WebSocket stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load WebSocket statistics");
      setLoading(false);
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load WebSocket statistics"
      });
      
      // Auto-clear error notification after 5 seconds
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  useEffect(() => {
    fetchStats();
    
    // Set up polling for real-time updates
    const intervalId = setInterval(fetchStats, 10000); // Update every 10 seconds
    
    return () => clearInterval(intervalId);
  }, []);
  
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <span className="ml-2">Loading WebSocket statistics...</span>
      </div>
    );
  }
  
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="text-red-500 mb-4">
          {error || "Failed to load data"}
        </div>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchStats();
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Safety check - if there's no data, show a message
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-amber-500">
          No WebSocket statistics available
        </div>
      </div>
    );
  }
  
  // Colors for charts
  const COLORS = ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c'];
  
  // Chart configuration for connections over time
  const connectionsChartConfig = {
    connections: {
      label: "Connections",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;
  
  // Chart configuration for actor mailbox sizes
  const mailboxChartConfig = {
    rate: {
      label: "Queue Size",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;
  
  // Chart configuration for message processing rate
  const messageRateChartConfig = {
    rate: {
      label: "Messages/sec",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;
  
  return (
    <div className="space-y-6">
      {notification && (
        <Notification 
          notification={notification} 
          onDismiss={clearNotification}
          className="mb-4"
        />
      )}
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">WebSocket Monitoring</h1>
        <button
          onClick={() => {
            setLoading(true);
            fetchStats();
            setNotification({
              type: "success",
              message: "Refreshing WebSocket statistics"
            });
            
            // Auto-clear info notification after 3 seconds
            setTimeout(() => {
              setNotification(null);
            }, 3000);
          }}
          className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 12a9 9 0 0 0 6.7 15L13 21"></path>
            <path d="M13 21h6v-6"></path>
          </svg>
          Refresh
        </button>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Current Connections</CardTitle>
            <CardDescription>Active WebSocket connections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.currentConnections}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Today&apos;s Connections</CardTitle>
            <CardDescription>Total connections today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalConnectionsToday}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Message Count</CardTitle>
            <CardDescription>Total messages processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalMessages}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections">Connection Stats</TabsTrigger>
          <TabsTrigger value="actors">Actor Metrics</TabsTrigger>
          <TabsTrigger value="sessions">Session Distribution</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connections Over Time</CardTitle>
              <CardDescription>WebSocket connections per hour</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ChartContainer
                config={connectionsChartConfig}
                className="aspect-auto h-full w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={stats.connectionsPerHour}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 50,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    tick={{ fontSize: 12 }}
                    interval={0}
                  />
                  <YAxis />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-1.5 shadow-md">
                          <p className="text-sm text-muted-foreground">Hour</p>
                          <p className="font-medium">{payload[0].payload.hour}</p>
                          <p className="text-sm text-muted-foreground">Connections</p>
                          <p className="font-medium">{payload[0].value}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Connections" 
                    fill="hsl(var(--chart-1))" 
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="actors" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Actor Mailbox Sizes</CardTitle>
                <CardDescription>Current mailbox queue depth</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={mailboxChartConfig} className="aspect-auto h-full w-full">
                  <BarChart
                    accessibilityLayer
                    data={stats.mailboxSizes}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="actor"
                      angle={0}
                      textAnchor="middle" 
                      height={60}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fontSize: 12 }}
                      interval={0}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-background px-3 py-1.5 shadow-md">
                            <p className="text-sm text-muted-foreground">Actor</p>
                            <p className="font-medium">{payload[0].payload.actor}</p>
                            <p className="text-sm text-muted-foreground">Queue Size</p>
                            <p className="font-medium">{payload[0].value}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="rate" fill="hsl(var(--chart-1))" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="leading-none text-muted-foreground">
                  Showing current queue size for each actor
                </div>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Message Processing Rate</CardTitle>
                <CardDescription>Messages processed per second</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ChartContainer config={messageRateChartConfig} className="aspect-auto h-full w-full">
                  <BarChart
                    accessibilityLayer
                    data={stats.messageRates}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="actor"
                      angle={0}
                      textAnchor="middle"
                      height={60}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fontSize: 12 }}
                      interval={0}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-background px-3 py-1.5 shadow-md">
                            <p className="text-sm text-muted-foreground">Actor</p>
                            <p className="font-medium">{payload[0].payload.actor}</p>
                            <p className="text-sm text-muted-foreground">Messages/sec</p>
                            <p className="font-medium">{payload[0].value}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="rate" fill="hsl(var(--chart-2))" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="leading-none text-muted-foreground">
                  Showing message processing rate for each actor
                </div>
              </CardFooter>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Actor System Summary</CardTitle>
                <CardDescription>Overview of actor system state</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card/60 p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Total Actors</div>
                    <div className="text-2xl font-semibold">{stats.actorCount}</div>
                  </div>
                  <div className="bg-card/60 p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Busiest Actor</div>
                    <div className="text-2xl font-semibold">
                      {stats.messageRates.sort((a, b) => b.rate - a.rate)[0]?.actor || "N/A"}
                    </div>
                  </div>
                  <div className="bg-card/60 p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Most Queued</div>
                    <div className="text-2xl font-semibold">
                      {stats.mailboxSizes.sort((a, b) => b.rate - a.rate)[0]?.actor || "N/A"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Distribution</CardTitle>
              <CardDescription>Active connections per session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.sessionConnections}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="sessionId"
                        label={({ sessionId, count }) => `${sessionId}: ${count}`}
                      >
                        {stats.sessionConnections.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium">Session Details</h3>
                    <p className="text-sm text-muted-foreground">
                      Active connections distributed across sessions
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {stats.sessionConnections.map((session, index) => (
                      <div key={session.sessionId} className="flex items-center justify-between p-2 bg-card/60 rounded-md border">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span>{session.sessionId}</span>
                        </div>
                        <span className="font-medium">{session.count} connections</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
