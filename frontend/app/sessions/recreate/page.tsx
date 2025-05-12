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
  fetchNightLords, 
  fetchNightfarers, 
  NightLord, 
  Nightfarer, 
  SessionDetails, 
  fetchSessionDetail, 
  recreateSession, 
  updateSessionCharacters, 
  joinSession 
} from "@/utils/api";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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

// MongoDB ObjectId type
interface MongoDBObjectId {
  $oid: string;
}

// Helper to extract MongoDB ObjectId
const extractMongoId = (id: string | MongoDBObjectId | Record<string, unknown> | null | undefined): string => {
  if (!id) return '';
  
  if (typeof id === 'object') {
    // Check if it's a MongoDB ObjectId format with $oid property
    if (id !== null && '$oid' in id) {
      return (id as MongoDBObjectId).$oid;
    }
    // Fall back to String() for other object types
    return String(id);
  }
  
  return id;
};

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
  
  // State for notifications
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // State for character data
  const [nightLords, setNightLords] = useState<NightLord[]>([]);
  const [nightfarers, setNightfarers] = useState<Nightfarer[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(true);
  
  // Navigation
  const router = useRouter();
  const searchParams = useSearchParams();
  const originalSessionId = searchParams.get('id');
  
  // Auth data
  const { userData } = useAuth();
  
  // Check if user is host
  const [isHost, setIsHost] = useState<boolean>(false);
  
  // Memoize functions to prevent them from being recreated on each render
  const fetchSessionDetailsData = useCallback(async () => {
    if (!originalSessionId) return;
    
    console.log(`Recreate page: Fetching session details for session ID: ${originalSessionId}`);
    try {
      const data = await fetchSessionDetail(originalSessionId);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error fetching session details";
      setNotification({
        type: 'error',
        message: errorMessage
      });
      router.push('/sessions');
    }
  }, [originalSessionId, router]);
  
  useEffect(() => {
    if (!originalSessionId) {
      setNotification({
        type: 'error',
        message: "No session ID provided"
      });
      router.push('/sessions');
      return;
    }
    
    // Fetch session details when component mounts
    fetchSessionDetailsData();
    
    // Fetch character data
    fetchCharacterData();
  }, [originalSessionId, fetchSessionDetailsData, router]);
  
  const fetchCharacterData = async () => {
    try {
      setIsLoadingCharacters(true);
      const [lords, farers] = await Promise.all([
        fetchNightLords(),
        fetchNightfarers()
      ]);
      setNightLords(lords);
      setNightfarers(farers);
    } catch {
      setNotification({
        type: 'error',
        message: "Failed to load characters. Please refresh the page."
      });
    } finally {
      setIsLoadingCharacters(false);
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
      setNotification({
        type: 'error',
        message: "Error decoding token: " + error
      });
      return null;
    }
  };
  
  // Function to clear notification
  const clearNotification = () => {
    setNotification(null);
  };
  
  const handleRecreateSession = async () => {
    if (!isHost) {
      setNotification({
        type: 'error',
        message: "Only the host can recreate a session"
      });
      return;
    }
    
    // Validate inputs
    if (!selectedFarer) {
      setNotification({
        type: 'error',
        message: "Please select a Nightfarer"
      });
      return;
    }
    
    if (!selectedLord) {
      setNotification({
        type: 'error',
        message: "Please select a Night Lord"
      });
      return;
    }
    
    if (!originalSessionId) {
      setNotification({
        type: 'error',
        message: "No original session ID provided"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First, recreate the session using the API function with the ORIGINAL session ID
      const recreateData = await recreateSession(originalSessionId);
      const newSessionId = extractMongoId(recreateData.id);
      
      // Now, update the new session with the selected characters
      await updateSessionCharacters(newSessionId, selectedLord, selectedFarer);
      
      // Navigate to the new session
      router.push(`/sessions/run?id=${newSessionId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJoinNewSession = async () => {
    // For non-hosts, they need to join the new session
    if (!selectedFarer) {
      setNotification({
        type: 'error',
        message: "Please select a Nightfarer"
      });
      return;
    }
    
    if (!originalSessionId || !sessionDetails) {
      setNotification({
        type: 'error',
        message: "Missing session information"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get user information first
      const userId = getUserIdFromToken();
      if (!userId || !userData) {
        throw new Error("User information not available");
      }
      
      // Get region based on user settings
      const userRegion = userData.autoRegion ? userData.cmRegion : userData.region;
      if (!userRegion) {
        throw new Error("User region information is missing");
      }
      
      // Get platform from user data
      const userPlatform = userData.platform;
      if (!userPlatform) {
        throw new Error("User platform information is missing");
      }
      
      // Get the new session ID from session details
      let newSessionId = null;
      
      // Check if the session details contain the new session ID
      if (sessionDetails && 'newSessionCreatedId' in sessionDetails && sessionDetails.newSessionCreatedId) {
        // Extract the ID, handling MongoDB ObjectId format if needed
        newSessionId = extractMongoId(sessionDetails.newSessionCreatedId as string | MongoDBObjectId | Record<string, unknown>);
        console.log('Using newSessionId from session details:', newSessionId);
      }
      
      if (!newSessionId) {
        throw new Error("New session ID not found in session data");
      }
      
      // Join the session
      await joinSession(
        newSessionId,
        selectedFarer,
        userId,
        userData.username,
        userData.covenantName || '',
        userRegion,
        userPlatform,
        userData.experience || 'Unknown'
      );
      
      setNotification({
        type: 'success',
        message: "Successfully joined new session"
      });
      
      // Navigate to the new session
      router.push(`/sessions/run?id=${newSessionId}`);
    } catch (error) {
      console.error('Join session error details:', error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const pageTitle = isHost ? "Recreate Session" : "Join New Session";
  const buttonText = isHost ? "Create New Session" : "Join Session";
  const handleAction = isHost ? handleRecreateSession : handleJoinNewSession;
  
  return (
    <MainLayout footer={<Footer />}>
      <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto">
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold">{pageTitle}</h1>
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
                <div className="space-y-4">
                  {isHost ? (
                    <div className="space-y-4">
                      <p className="text-muted-foreground text-sm">The session name and in-game password will remain the same as the original session.</p>
                      
                      {/* Mobile: ComboBox for Night Lord selection */}
                      <div className="space-y-2 md:hidden">
                        <label className="text-sm md:text-base font-medium">
                          Select New Night Lord
                        </label>
                        {isLoadingCharacters ? (
                          <div className="text-center py-4">Loading Night Lords...</div>
                        ) : (
                          <CharacterComboBox
                            characters={nightLords}
                            selectedValue={selectedLord}
                            onSelect={setSelectedLord}
                            placeholder="Select Night Lord..."
                            emptyMessage="No Night Lord found."
                          />
                        )}
                      </div>
                      
                      {/* Desktop: Grid for Night Lord selection */}
                      <div className="space-y-2 hidden md:block">
                        <label className="text-sm md:text-base font-medium">
                          Select New Night Lord
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          {isLoadingCharacters ? (
                            <div className="col-span-full text-center py-4">Loading Night Lords...</div>
                          ) : (
                            nightLords.map(lord => (
                              <Button 
                                key={lord.id} 
                                variant="outline" 
                                className={`min-h-[4rem] h-auto py-2 px-1 flex flex-col items-center justify-center text-center hover:border-purple-500 hover:bg-purple-950/20 ${
                                  selectedLord === lord.name ? "border-purple-500 bg-purple-950/20" : ""
                                }`}
                                style={{ whiteSpace: 'normal' }}
                                onClick={() => setSelectedLord(lord.name)}
                                type="button"
                              >
                                <span className="text-sm w-full overflow-hidden" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{lord.name}</span>
                              </Button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm md:text-base font-medium">Night Lord: {sessionDetails.nightLord}</p>
                      <p className="text-sm text-muted-foreground">
                        The host has created a new session with the same team. Choose your character to join.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile: ComboBox for Nightfarer selection */}
              <div className="space-y-2 md:hidden">
                <label className="text-sm md:text-base font-medium">
                  Select {isHost ? "Your New" : ""} Nightfarer
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
                  Select {isHost ? "Your New" : ""} Nightfarer
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
                  onClick={handleAction}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : buttonText}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
} 