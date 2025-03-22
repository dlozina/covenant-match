"use client";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { jwtDecode } from "jwt-decode";

// Define a type for session details
interface SessionDetails {
  id: string;
  name: string;
  nightLord: string;
  password: string | null;
  hostId: string;
  nightfarer?: string;
  joinedPlayers?: { userId: string; username: string; nightfarer: string }[];
}

// Define JWT Claims interface
interface JwtClaims {
  sub: string;  // User ID
  role: string;
  exp: number;
  iat: number;
}

export default function RecreateSessionPage() {
  return (
    <ProtectedRoute>
      <RecreateSessionContent />
    </ProtectedRoute>
  );
}

function RecreateSessionContent() {
  // State for character selection
  const [selectedLord, setSelectedLord] = useState<string | null>(null);
  const [selectedFarer, setSelectedFarer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // State for original session data
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  
  // Navigation
  const router = useRouter();
  const searchParams = useSearchParams();
  const originalSessionId = searchParams.get('id');
  
  // Auth data
  const { userData } = useAuth();
  
  // Check if user is host
  const [isHost, setIsHost] = useState<boolean>(false);
  
  useEffect(() => {
    // Fetch original session details when component mounts
    if (originalSessionId) {
      console.log(`Recreate page: Initializing with original session ID: ${originalSessionId}`);
      fetchSessionDetails();
    } else {
      toast.error("No session ID provided");
      router.push('/sessions');
    }
  }, [originalSessionId]);
  
  const fetchSessionDetails = async () => {
    console.log(`Recreate page: Fetching session details for session ID: ${originalSessionId}`);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions/${originalSessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSessionDetails(data);
        
        // Check if the current user is the host
        const userId = getUserIdFromToken();
        if (userId && data.hostId === userId) {
          setIsHost(true);
        } else {
          setIsHost(false);
          // If not host, we'll need to handle this differently
          // For non-hosts, this is a "join new session" page
        }
      } else {
        toast.error(data.message || 'Failed to fetch session details');
        router.push('/sessions');
      }
    } catch (error) {
      toast.error('Error fetching session details: ' + error);
      router.push('/sessions');
    }
  };
  
  // Function to extract user ID from JWT token
  const getUserIdFromToken = (): string | null => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const decoded = jwtDecode<JwtClaims>(token);
      return decoded.sub;
    } catch (error) {
      toast.error("Error decoding token: " + error);
      return null;
    }
  };
  
  const handleRecreateSession = async () => {
    if (!isHost) {
      toast.error("Only the host can recreate a session");
      return;
    }
    
    // Validate inputs
    if (!selectedFarer) {
      toast.error("Please select a Nightfarer");
      return;
    }
    
    if (!selectedLord) {
      toast.error("Please select a Night Lord");
      return;
    }
    
    if (!originalSessionId) {
      toast.error("No original session ID provided");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      // First, recreate the session using the existing API endpoint
      const recreateResponse = await fetch(`${apiBaseUrl}/api/v1/sessions/${originalSessionId}/recreate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });
      
      const recreateData = await recreateResponse.json();
      
      if (!recreateResponse.ok) {
        throw new Error(recreateData.message || "Failed to recreate session");
      }
      
      const newSessionId = recreateData.id;
      
      // Now, update the new session with the selected characters
      const updateResponse = await fetch(`${apiBaseUrl}/api/v1/sessions/${newSessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nightLord: selectedLord,
          hostNightfarer: selectedFarer
        }),
      });
      
      if (!updateResponse.ok) {
        const updateData = await updateResponse.json();
        throw new Error(updateData.message || "Failed to update session characters");
      }
      // Set a flag in sessionStorage so the run page knows we came from here
      sessionStorage.setItem('fromRecreatePage', 'true');
      
      router.push(`/sessions/run?id=${newSessionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJoinNewSession = async () => {
    // For non-hosts, they need to join the new session
    if (!selectedFarer) {
      toast.error("Please select a Nightfarer");
      return;
    }
    
    if (!originalSessionId || !sessionDetails) {
      toast.error("Missing session information");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // We need to get the new session ID from sessionStorage
      const autoJoinSessionId = sessionStorage.getItem('autoJoinSessionId');
      
      if (!autoJoinSessionId) {
        throw new Error("New session ID not found");
      }
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      const userId = getUserIdFromToken();
      
      if (!userId || !userData) {
        throw new Error("User information not available");
      }
       
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions/${autoJoinSessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nightfarer: selectedFarer,
          userId: userId,
          username: userData.username
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success("Successfully joined new session");
        // Clear the auto-join data from sessionStorage
        sessionStorage.removeItem('autoJoinSessionId');
        sessionStorage.removeItem('autoJoinCharacter');
        
        // Set a flag in sessionStorage so the run page knows we came from here
        sessionStorage.setItem('fromRecreatePage', 'true');
        
        router.push(`/sessions/run?id=${autoJoinSessionId}`);
      } else {
        toast.error(data.message || "Failed to join session");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const pageTitle = isHost ? "Recreate Session" : "Join New Session";
  const buttonText = isHost ? "Create New Session" : "Join Session";
  const handleAction = isHost ? handleRecreateSession : handleJoinNewSession;
  
  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-6 px-4 mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">{pageTitle}</h1>
          <Button variant="outline" asChild>
            <Link href="/sessions">Back to main sessions page (Quit session)</Link>
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
                {isHost ? (
                  <div className="flex flex-col space-y-4">
                    <p className="text-muted-foreground text-sm">The session name and in-game password will remain the same as the original session.</p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Select New Night Lord
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          "Tricephalos", 
                          "PCR", 
                          "Malenia, Blade of Miquella", 
                          "Maliketh", 
                          "Mohg", 
                          "Midra", 
                          "Bayle", 
                          "Messmer"
                        ].map(lord => (
                          <Button 
                            key={lord} 
                            variant="outline" 
                            className={`min-h-[4rem] h-auto py-2 px-1 flex flex-col items-center justify-center text-center hover:border-purple-500 hover:bg-purple-950/20 ${
                              selectedLord === lord ? "border-purple-500 bg-purple-950/20" : ""
                            }`}
                            style={{ whiteSpace: 'normal' }}
                            onClick={() => setSelectedLord(lord)}
                          >
                            <span className="text-sm w-full overflow-hidden" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{lord}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <p className="text-sm font-medium">Night Lord: {sessionDetails.nightLord}</p>
                    <p className="text-sm text-muted-foreground">
                      The host has created a new session with the same team. Choose your character to join.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select {isHost ? "Your New" : ""} Nightfarer
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  "Wylder", 
                  "Guardian", 
                  "Recluse", 
                  "Duchess", 
                  "Patces", 
                  "Jolan", 
                  "Igon", 
                  "Alexander"
                ].map(farer => (
                  <Button 
                    key={farer} 
                    variant="outline" 
                    className={`min-h-[4rem] h-auto py-2 px-1 flex flex-col items-center justify-center text-center hover:border-purple-500 hover:bg-purple-950/20 ${
                      selectedFarer === farer ? "border-purple-500 bg-purple-950/20" : ""
                    }`}
                    style={{ whiteSpace: 'normal' }}
                    onClick={() => setSelectedFarer(farer)}
                  >
                    <span className="text-sm w-full overflow-hidden" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{farer}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleAction}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : buttonText}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 