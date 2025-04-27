"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Label, Tooltip } from "recharts";
import { Loader2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Notification, NotificationType } from "@/components/ui/notification";
import { useAuth } from "@/lib/auth-context";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

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
  const [sessionPage, setSessionPage] = useState(0); // Current page for session pagination
  const sessionsPerPage = 5; // Number of sessions to display per page
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
  
  // Chart configuration for session distribution
  const sessionChartConfig = {
    count: {
      label: "Connections",
    },
    sessionId: {
      label: "Session",
    },
    ...stats?.sessionConnections.reduce((acc, session, index) => {
      return {
        ...acc,
        [session.sessionId]: {
          label: session.sessionId,
          color: `hsl(var(--chart-${(index % 5) + 1}))`,
        }
      };
    }, {}) || {},
  } satisfies ChartConfig;
  
  // Calculate total sessions
  const totalSessions = stats?.sessionConnections.length || 0;
  
  // Calculate pagination for sessions
  const paginatedSessions = stats
    ? stats.sessionConnections.slice(
        sessionPage * sessionsPerPage,
        (sessionPage + 1) * sessionsPerPage
      )
    : [];
  const totalPages = stats
    ? Math.ceil(stats.sessionConnections.length / sessionsPerPage)
    : 0;

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
        <Button
          variant="outline" 
          size="sm" 
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
          className="w-full sm:w-auto"
        >
         <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} connections`]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))", 
                      borderRadius: "0.5rem", 
                      padding: "0.75rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                      color: "hsl(var(--foreground))",
                      fontSize: "0.875rem"
                    }}
                    itemStyle={{
                      color: "hsl(var(--foreground))",
                      padding: "0.25rem 0"
                    }}
                    labelStyle={{
                      fontWeight: "600",
                      color: "hsl(var(--muted-foreground))",
                      marginBottom: "0.25rem"
                    }}
                    wrapperStyle={{
                      outline: "none"
                    }}
                    cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                  />
                  <Bar 
                    dataKey="count" 
                    name="Connections" 
                    fill="hsl(var(--chart-1))" 
                    radius={4}
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
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [`${value} messages`, props.payload.actor]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))", 
                        borderRadius: "0.5rem", 
                        padding: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                        color: "hsl(var(--foreground))",
                        fontSize: "0.875rem"
                      }}
                      itemStyle={{
                        color: "hsl(var(--foreground))",
                        padding: "0.25rem 0"
                      }}
                      labelStyle={{
                        fontWeight: "600",
                        color: "hsl(var(--muted-foreground))",
                        marginBottom: "0.25rem"
                      }}
                      wrapperStyle={{
                        outline: "none"
                      }}
                      cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
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
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [`${value} msgs/sec`, props.payload.actor]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))", 
                        border: "1px solid hsl(var(--border))", 
                        borderRadius: "0.5rem", 
                        padding: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                        color: "hsl(var(--foreground))",
                        fontSize: "0.875rem"
                      }}
                      itemStyle={{
                        color: "hsl(var(--foreground))",
                        padding: "0.25rem 0"
                      }}
                      labelStyle={{
                        fontWeight: "600",
                        color: "hsl(var(--muted-foreground))",
                        marginBottom: "0.25rem"
                      }}
                      wrapperStyle={{
                        outline: "none"
                      }}
                      cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
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
            <CardHeader className="items-center">
              <CardTitle>Session Distribution</CardTitle>
              <CardDescription>Active connections per session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[300px] flex items-center justify-center">
                  <ChartContainer
                    config={sessionChartConfig}
                    className="mx-auto aspect-square max-h-[300px]"
                  >
                    <PieChart>
                      <Tooltip 
                        formatter={(value, name) => [`${value} connections`, `${name}`]}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))", 
                          border: "1px solid hsl(var(--border))", 
                          borderRadius: "0.5rem", 
                          padding: "0.75rem",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                          color: "hsl(var(--foreground))",
                          fontSize: "0.875rem"
                        }}
                        itemStyle={{
                          color: "hsl(var(--foreground))",
                          padding: "0.25rem 0"
                        }}
                        labelStyle={{
                          fontWeight: "600",
                          color: "hsl(var(--muted-foreground))",
                          marginBottom: "0.25rem"
                        }}
                        wrapperStyle={{
                          outline: "none"
                        }}
                      />
                      <Pie
                        data={stats.sessionConnections}
                        dataKey="count"
                        nameKey="sessionId"
                        innerRadius={60}
                        outerRadius={80}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {stats.sessionConnections.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`hsl(var(--chart-${(index % 5) + 1}))`} 
                          />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-3xl font-bold"
                                  >
                                    {totalSessions}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 24}
                                    className="fill-muted-foreground"
                                  >
                                    Sessions
                                  </tspan>
                                </text>
                              );
                            }
                            return null;
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </div>
                
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium">Session Details</h3>
                    <p className="text-sm text-muted-foreground">
                      Active connections distributed across sessions
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {paginatedSessions.map((session, index) => {
                      // Calculate the actual index in the full array
                      const actualIndex = sessionPage * sessionsPerPage + index;
                      return (
                        <div key={session.sessionId} className="flex items-center justify-between p-2 bg-card/60 rounded-md border">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `hsl(var(--chart-${(actualIndex % 5) + 1}))` }}></div>
                            <span>{session.sessionId}</span>
                          </div>
                          <span className="font-medium">{session.count} connections</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {sessionPage + 1} of {totalPages}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSessionPage(p => Math.max(0, p - 1))}
                          disabled={sessionPage === 0}
                          className="p-1 rounded-md hover:bg-muted disabled:opacity-50"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setSessionPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={sessionPage === totalPages - 1}
                          className="p-1 rounded-md hover:bg-muted disabled:opacity-50"
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="leading-none text-muted-foreground">
                Showing active connections distributed across all sessions
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
