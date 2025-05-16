"use client";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useEffect, useCallback, Suspense } from "react";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveRedirectUrl } from "@/utils/auth-redirect";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


// Define JWT Claims interface
interface JwtClaims {
  sub: string;  // User ID
  role: string;
  exp: number;
  iat: number;
}

// Save the session ID immediately on page load
// This script runs as soon as the page is loaded, before any React components
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');
  
  if (sessionId) {
    // Check if user is logged in before saving redirect URL
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token; // Simple check for token existence
    
    // Only save redirect URL if user is not logged in
    if (!isLoggedIn) {
      const currentUrl = window.location.pathname + window.location.search;
      localStorage.setItem('redirectAfterLogin', currentUrl);
    }
  }
}

// Client-side redirect handler that runs before the Suspense boundary
function ClientRedirectHandler() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');

  // If user is not logged in, save the current URL and redirect to login
  useEffect(() => {
    if (!isLoading && !isLoggedIn && sessionId) {
      // Save current URL for redirect after login
      const currentUrl = window.location.pathname + window.location.search;
      console.log('Saving redirect URL:', currentUrl);
      
      // Try both methods to ensure it's saved
      // First, use the utility function
      saveRedirectUrl(currentUrl);
      
      // Also directly save to localStorage as a backup
      if (typeof localStorage !== 'undefined') {
        console.log('Directly saving to localStorage');
        localStorage.setItem('redirectAfterLogin', currentUrl);
      }
      
      // Log what's in localStorage after saving
      const savedUrl = localStorage.getItem('redirectAfterLogin');
      console.log('Verified saved URL:', savedUrl);
      
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, router, sessionId]);

  return null;
}

export default function JoinSessionPage() {
  const { isLoading } = useAuth();
  
  // Show loader while checking auth status
  if (isLoading) {
    return (
      <MainLayout footer={<Footer />}>
        <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-700 to-indigo-900"></div>
            <div className="mt-4 text-sm text-muted-foreground">Loading...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <ProtectedRoute>
      <Suspense fallback={
        <MainLayout footer={<Footer />}>
          <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-700 to-indigo-900"></div>
              <div className="mt-4 text-sm text-muted-foreground">Loading session details...</div>
            </div>
          </div>
        </MainLayout>
      }>
        <ClientRedirectHandler />
        <JoinSessionContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function CharacterComboBox({
  characters,
  selectedValue,
  onSelect,
  placeholder,
  emptyMessage,
}: {
  characters: { id: string; name: string }[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder: string;
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
        >
          {selectedValue
            ? characters.find((char) => char.name === selectedValue)?.name || placeholder
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {characters.map((character) => (
                <CommandItem
                  key={character.id}
                  value={character.name}
                  onSelect={(currentValue) => {
                    onSelect(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === character.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {character.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  
  const checkActiveSession = useCallback(async () => {
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
  }, [sessionId]);
  
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

    loadNightfarers();
    checkActiveSession();
  }, [checkActiveSession]);
  
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

    // Get region based on user settings
    const userRegion = userData.autoRegion ? userData.cmRegion : userData.region;
    
    if (!userRegion) {
      setNotification({
        type: 'error',
        message: "User region information is missing"
      });
      return;
    }
    
    // Get platform from user data
    const userPlatform = userData.platform;
    
    if (!userPlatform) {
      setNotification({
        type: 'error',
        message: "User platform information is missing"
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
        userData.covenantName || 'Unknown',
        userRegion,
        userPlatform,
        userData.experience || 'Unknown'
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
      <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto">
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold">Join Session</h1>
            <Button variant="outline" asChild className="h-10">
              <Link href="/sessions">Back to Sessions</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {sessionDetails ? sessionDetails.name : "Loading session..."}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Notification 
                notification={notification} 
                onDismiss={clearNotification}
              />
              
              {sessionDetails && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Night Lord: {sessionDetails.nightLord}</p>
                  {renderPlayers()}
                </div>
              )}

              {/* Mobile: ComboBox for Nightfarer selection */}
              <div className="space-y-2 md:hidden">
                <label className="text-sm md:text-base font-medium">
                  Select Nightfarer
                </label>
                {isLoadingCharacters ? (
                  <div className="text-center py-4">Loading Nightfarers...</div>
                ) : (
                  <CharacterComboBox
                    characters={nightfarers}
                    selectedValue={selectedFarer}
                    onSelect={setSelectedFarer}
                    placeholder="Select Nightfarer..."
                    emptyMessage="No Nightfarer found."
                  />
                )}
              </div>

              {/* Desktop: Grid for Nightfarer selection */}
              <div className="space-y-2 hidden md:block">
                <label className="text-sm md:text-base font-medium">
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
                        type="button"
                      >
                        <span className="text-sm w-full overflow-hidden" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{farer.name}</span>
                      </Button>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full h-10 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600" 
                  onClick={handleJoinSession}
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "Join Session"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
} 