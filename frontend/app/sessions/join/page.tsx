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
  nightfarer?: string;
  // Add other fields as needed
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');
  const { userData } = useAuth();
  
  useEffect(() => {
    // Fetch session details when component mounts
    if (sessionId) {
      fetchSessionDetails();
    } else {
      toast.error("No session ID provided");
    }
  }, [sessionId]);
  
  const fetchSessionDetails = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSessionDetails(data);
      } else {
        toast.error(data.message || "Failed to fetch session details");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error fetching session details:", error);
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
      console.error("Error decoding token:", error);
      return null;
    }
  };
  
  const handleJoinSession = async () => {
    // Validate inputs
    if (!selectedFarer) {
      toast.error("Please select a Nightfarer");
      return;
    }
    
    if (!sessionId) {
      toast.error("No session ID provided");
      return;
    }
    
    if (!userData || !userData.username) {
      toast.error("User information is missing");
      return;
    }
    
    // Get user ID from token
    const userId = getUserIdFromToken();
    if (!userId) {
      toast.error("User ID could not be determined");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions/${sessionId}/join`, {
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
        toast.success("Successfully joined session");
        router.push(`/sessions/run?id=${sessionId}`);
      } else {
        toast.error(data.message || "Failed to join session");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Error joining session:", error);
    } finally {
      setIsLoading(false);
    }
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
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Nightfarer
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