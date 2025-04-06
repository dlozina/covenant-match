"use client";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { jwtDecode } from "jwt-decode";
import { Notification, NotificationType } from "@/components/ui/notification";
import { 
  fetchNightfarers, 
  Nightfarer, 
  SessionDetails, 
  fetchSessionDetail, 
  joinSession 
} from "@/utils/api";
import { sessionService } from "@/utils/api/session-service";

// Define JWT Claims interface
interface JwtClaims {
  sub: string;  // User ID
  role: string;
  exp: number;
  iat: number;
}

export default function JoinSessionPage() {
  return (
    <ProtectedRoute>
      <JoinSessionContent />
    </ProtectedRoute>
  );
}

function JoinSessionContent() {
  const [selectedFarer, setSelectedFarer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [nightfarers, setNightfarers] = useState<Nightfarer[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');
  const { userData } = useAuth();
  
  // Fetch nightfarers on component mount
  useEffect(() => {
    const loadNightfarers = async () => {
      try {
        setIsLoadingCharacters(true);
        const farers = await fetchNightfarers();
        setNightfarers(farers);
      } catch {
        setNotification({
          type: 'error',
          message: "Failed to load Nightfarers. Please refresh the page."
        });
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    const checkActiveSession = async () => {
      try {
        const activeSession = await sessionService.getActiveSession();
        
        // If user has an active session and it's not the one they're trying to join
        if (activeSession && activeSession.id !== sessionId) {
          setNotification({
            type: 'warning',
            message: (
              <div>
                You are already in an active session: &apos;{activeSession.name}&apos; (ID: {activeSession.id}) with status {activeSession.status}. 
                <Link href={`/sessions/run?id=${activeSession.id}`} className="underline font-bold ml-1">
                  Click here
                </Link> to go to your active session.
              </div>
            )
          });
        }
      } catch (error) {
        // Ignore errors checking for active sessions
        console.error("Error checking for active sessions:", error);
      }
    };

    loadNightfarers();
    checkActiveSession();
  }, []);
  
  // Use useCallback for fetchSessionDetails to avoid recreating it on each render
  const fetchSessionDetailsData = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const data = await fetchSessionDetail(sessionId);
      setSessionDetails(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching session details';
      setNotification({
        type: 'error',
        message: errorMessage
      });
    }
  }, [sessionId, setNotification]);
  
  useEffect(() => {
    // Fetch session details only once when component mounts
    if (sessionId) {
      fetchSessionDetailsData();
    } else {
      setNotification({
        type: 'error',
        message: 'No session ID provided'
      });
    }
  }, [sessionId, fetchSessionDetailsData]);
  
  // Function to extract user ID from JWT token
  const getUserIdFromToken = (): string | null => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const decoded = jwtDecode<JwtClaims>(token);
      return decoded.sub;
    } catch (error) {
      setNotification({
        type: 'error',
        message: "Error decoding token: " + error
      });
      return null;
    }
  };
  
  const handleJoinSession = async () => {
    // Validate inputs
    if (!selectedFarer) {
      setNotification({
        type: 'error',
        message: "Please select a Nightfarer"
      });
      return;
    }
    
    if (!sessionId) {
      setNotification({
        type: 'error',
        message: "No session ID provided"
      });
      return;
    }
    
    if (!userData || !userData.username) {
      setNotification({
        type: 'error',
        message: "User information is missing"
      });
      return;
    }
    
    // Get user ID from token
    const userId = getUserIdFromToken();
    if (!userId) {
      setNotification({
        type: 'error',
        message: "User ID could not be determined"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await joinSession(
        sessionId,
        selectedFarer,
        userId,
        userData.username,
        userData.covenantName || 'Unknown'
      );
      
      router.push(`/sessions/run?id=${sessionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      
      // Check if error message contains information about already being in a session
      if (errorMessage.includes("You are already in an active session")) {
        // Extract session ID from the error message using regex
        const sessionIdMatch = errorMessage.match(/\(ID: ([a-f0-9]+)\)/i);
        const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
        
        if (sessionId) {
          setNotification({
            type: 'warning',
            message: (
              <div>
                {errorMessage}. <Link href={`/sessions/run?id=${sessionId}`} className="underline font-bold">Click here</Link> to go to your active session.
              </div>
            )
          });
        } else {
          setNotification({
            type: 'warning',
            message: errorMessage
          });
        }
      } else {
        setNotification({
          type: 'error',
          message: errorMessage
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to clear notification
  const clearNotification = () => {
    setNotification(null);
  };
  
  // Render players list
  const renderPlayers = () => {
    if (!sessionDetails || !sessionDetails.joinedPlayers || sessionDetails.joinedPlayers.length === 0) {
      return <p className="text-sm text-muted-foreground">No players have joined yet.</p>;
    }
    
    return (
      <div className="space-y-2 mt-4">
        <h3 className="text-sm font-medium">Players:</h3>
        <ul className="space-y-1">
          {sessionDetails.joinedPlayers.map((player) => (
            <li key={player.userId} className="text-sm">
              {player.username} - {player.nightfarer}
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-6 px-4 mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Join Session</h1>
          <Button variant="outline" asChild>
            <Link href="/sessions">Back to Sessions</Link>
          </Button>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>
              {sessionDetails ? sessionDetails.name : "Loading session..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {sessionDetails && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Night Lord: {sessionDetails.nightLord}</p>
                {renderPlayers()}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Nightfarer
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {isLoadingCharacters ? (
                  <div className="col-span-full text-center py-4">Loading Nightfarers...</div>
                ) : (
                  nightfarers.map(farer => (
                    <Button 
                      key={farer.id} 
                      variant="outline" 
                      className={`min-h-[4rem] h-auto py-2 px-1 flex flex-col items-center justify-center text-center hover:border-purple-500 hover:bg-purple-950/20 ${
                        selectedFarer === farer.name ? "border-purple-500 bg-purple-950/20" : ""
                      }`}
                      style={{ whiteSpace: 'normal' }}
                      onClick={() => setSelectedFarer(farer.name)}
                    >
                      <span className="text-sm w-full overflow-hidden" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{farer.name}</span>
                    </Button>
                  ))
                )}
              </div>
            </div>
            
            <Notification 
              notification={notification} 
              onDismiss={clearNotification}
            />

            <div className="pt-4">
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleJoinSession}
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Session"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 