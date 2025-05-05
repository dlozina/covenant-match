"use client";

import { useEffect, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { UserSessionsResponse } from "@/utils/api/types";
import { formatDate } from "@/lib/utils";
import { UserCircle2, Shield, Users, Clock, ArrowRight } from "lucide-react";
import { httpClient } from "@/utils/api/http-client";

// Static green badge for active sessions
const ActiveSessionBadge = () => (
  <Badge 
    variant="outline" 
    className="ml-2 bg-green-500/20 text-green-400"
  >
    In Progress
  </Badge>
);

// Memoized continue button with blinking state
const ContinueButton = memo(function ContinueButton({ sessionId }: { sessionId: string }) {
  const [isBlinking, setIsBlinking] = useState<boolean>(true);
  const router = useRouter();
  
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(prev => !prev);
    }, 1500); // Less frequent blinking (1.5s)
    
    return () => clearInterval(blinkInterval);
  }, []);
  
  return (
    <Button 
      className={`w-full mt-2 ${isBlinking ? 'bg-green-600 hover:bg-green-700' : ''}`}
      onClick={() => router.push(`/sessions/run?id=${sessionId}`)}
    >
      Continue Session
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  );
});

export default function UserSessionsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Sessions</h1>
        <SessionsContent />
      </div>
    </MainLayout>
  );
}

function SessionsContent() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, authLoading, router]);

  if (authLoading) {
    return <LoadingState />;
  }

  if (!isLoggedIn) {
    return null; // Will redirect
  }

  return (
    <div className="space-y-8">
      <CurrentSessionSection />
      <PreviousSessionSection />
    </div>
  );
}

function CurrentSessionSection() {
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSession, setCurrentSession] = useState<UserSessionsResponse['currentSession'] | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        
        // Get user's sessions
        const sessionsData = await httpClient.get<UserSessionsResponse>('/api/v1/users/sessions', true);
        setCurrentSession(sessionsData.currentSession);
      } catch (error) {
        console.error("Failed to fetch active session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">Current Session</h2>
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (!currentSession) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">Current Session</h2>
        <Card className="w-full bg-card/50 border border-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">You are not currently in any active session.</p>
              <Button 
                className="mt-4" 
                onClick={() => router.push('/sessions')}
              >
                Find a Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        Current Session
        <ActiveSessionBadge />
      </h2>
      
      <div className="rounded-lg border-2 border-green-500/50">
        <Card className="w-full bg-card/50 border-0 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-indigo-400" />
                <span>{currentSession.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {currentSession.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Night Lord</p>
                    <p className="text-sm text-muted-foreground">{currentSession.nightLord}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Started</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(new Date(parseInt(currentSession.createdAt.$date.$numberLong)).toISOString())}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  Players
                </h4>
                <div className="space-y-2">
                  {currentSession.joinedPlayers.map((player) => (
                    <div key={player.username} className="flex items-center gap-3 p-1.5 px-2 rounded-md bg-card/30 border border-purple-900/10 text-sm">
                      <span>{player.username}</span>
                      <span className="text-muted-foreground border-l border-purple-900/10 pl-2">{player.nightfarer}</span>
                      {player.userId === currentSession.hostId && (
                        <Badge variant="outline" className="ml-auto text-xs bg-blue-500/10 text-blue-400">Host</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <ContinueButton sessionId={currentSession.id} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PreviousSessionSection() {
  const [loading, setLoading] = useState<boolean>(true);
  const [previousSession, setPreviousSession] = useState<UserSessionsResponse['previousSession'] | null>(null);
  const router = useRouter();
  const { userData } = useAuth();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const sessionsData = await httpClient.get<UserSessionsResponse>('/api/v1/users/sessions', true);
        setPreviousSession(sessionsData.previousSession);
      } catch (error) {
        console.error("Failed to fetch previous session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">Previous Session</h2>
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (!previousSession) {
    return (
      <section>
        <h2 className="text-xl font-semibold mb-4">Previous Session</h2>
        <Card className="w-full bg-card/50 border border-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">You haven&apos;t participated in any sessions yet.</p>
              <Button 
                className="mt-4" 
                onClick={() => router.push('/sessions')}
              >
                Find a Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Get the current user's result from the previous session
  const userId = userData?.id;
  
  const userResult = previousSession.results.find(result => 
    result.userId === userId)?.result || 'Unknown';
  
  const isWin = userResult === 'Win';
  const isLoss = userResult === 'Loss';
  const isDisconnect = userResult === 'Disconnect';

  // Format the session date and duration
  const startDate = previousSession.startedAt ? 
    new Date(parseInt(previousSession.startedAt.$date.$numberLong)) : null;
  const endDate = previousSession.completedAt ? 
    new Date(parseInt(previousSession.completedAt.$date.$numberLong)) : null;
  
  // Calculate session duration if both dates are available
  let sessionDuration = "";
  if (startDate && endDate) {
    const durationMs = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    sessionDuration = `${minutes}m ${seconds}s`;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Previous Session</h2>
      
      <Card className="w-full bg-card/50 border border-purple-900/20 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-indigo-400" />
              <span>{previousSession.name}</span>
            </div>
            {isWin ? (
              <Badge variant="outline" className="bg-green-500/20 text-green-400">Win</Badge>
            ) : isLoss ? (
              <Badge variant="outline" className="bg-red-500/20 text-red-400">Loss</Badge>
            ) : isDisconnect ? (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">Disconnect</Badge>
            ) : (
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400">Unknown</Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 gap-4">
            {/* Session details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Night Lord</p>
                    <p className="text-sm text-muted-foreground">{previousSession.nightLord}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Session Time</p>
                    <p className="text-sm text-muted-foreground">
                      {previousSession.completedAt 
                        ? formatDate(new Date(parseInt(previousSession.completedAt.$date.$numberLong)).toISOString())
                        : "Not completed"}
                    </p>
                    {sessionDuration && (
                      <p className="text-xs text-muted-foreground">Duration: {sessionDuration}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-indigo-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Session Details</p>
                    <div className="grid grid-cols-2 gap-x-4 text-xs mt-1">
                      <p className="text-muted-foreground">Region:</p>
                      <p>{previousSession.region}</p>
                      <p className="text-muted-foreground">Platform:</p>
                      <p>{previousSession.platform}</p>
                      <p className="text-muted-foreground">Privacy:</p>
                      <p>{previousSession.isPrivate ? 'Private' : 'Public'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Players list */}
            <div className="mt-2">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                Players & Results
              </h4>
              <div className="space-y-3">
                {previousSession.joinedPlayers.map((player) => {
                  const playerResult = previousSession.results.find(
                    result => result.userId === player.userId
                  );
                  
                  return (
                    <div key={player.username} className="p-2 rounded-md bg-card/30 border border-purple-900/10">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{player.username}</span>
                          {player.userId === previousSession.hostId && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400">Host</Badge>
                          )}
                          {player.userId === userId && (
                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {playerResult?.result === 'Win' ? (
                            <Badge className="bg-green-500/20 text-green-400 border-0">Win</Badge>
                          ) : playerResult?.result === 'Loss' ? (
                            <Badge className="bg-red-500/20 text-red-400 border-0">Loss</Badge>
                          ) : playerResult?.result === 'Disconnect' ? (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-0">Disconnect</Badge>
                          ) : null}
                        </div>
                      </div>
                      
                      {/* Desktop view - Two column grid */}
                      <div className="hidden sm:grid grid-cols-2 gap-x-6 gap-y-1 mt-1 text-xs">
                        <div className="flex items-center">
                          <p className="text-muted-foreground w-24">Nightfarer:</p>
                          <p>{player.nightfarer}</p>
                        </div>
                        <div className="flex items-center">
                          <p className="text-muted-foreground w-24">Covenant:</p>
                          <p>{player.covenantName}</p>
                        </div>
                        <div className="flex items-center">
                          <p className="text-muted-foreground w-24">Experience:</p>
                          <p>{player.experience}</p>
                        </div>
                        {playerResult && (
                          <div className="flex items-center">
                            <p className="text-muted-foreground w-24">Rating:</p>
                            <p>{playerResult.rating}/5</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Mobile view - Single column with more compact layout */}
                      <div className="sm:hidden space-y-1 mt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <p className="text-muted-foreground">Nightfarer:</p>
                          <p>{player.nightfarer}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3">
                          <div className="flex items-center gap-1">
                            <p className="text-muted-foreground">Covenant:</p>
                            <p className="truncate max-w-[120px]">{player.covenantName}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <p className="text-muted-foreground">Exp:</p>
                            <p>{player.experience}</p>
                          </div>
                        </div>
                        {playerResult && (
                          <div className="flex items-center gap-1">
                            <p className="text-muted-foreground">Rating:</p>
                            <p>{playerResult.rating}/5</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-4">Current Session</h2>
        <Skeleton className="h-64 w-full" />
      </section>
      
      <section>
        <h2 className="text-xl font-semibold mb-4">Previous Session</h2>
        <Skeleton className="h-64 w-full" />
      </section>
    </div>
  );
}
