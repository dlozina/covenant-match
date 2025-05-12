"use client";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/lib/auth-context";
import { clearFriendRequestState } from "@/utils/saveSesionState";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  fetchNightLords, 
  fetchNightfarers, 
  NightLord, 
  Nightfarer, 
  createSession, 
  CreateSessionParams
} from "@/utils/api";
import { sessionService } from "@/utils/api/session-service";
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

// Type for our notification state
type NotificationType = {
  message: string | React.ReactNode;
  type: 'error' | 'success' | 'warning';
}

// Session validation schema
const sessionFormSchema = z.object({
  sessionName: z
    .string()
    .min(1, { message: "Session name is required" })
    .max(22, { message: "Session name must not be longer than 22 characters" })
    .trim(),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .max(6, { message: "Password must not be longer than 6 characters" })
    .trim(),
  sessionType: z.enum(["regular", "friends-only", "private"])
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function CreateSessionPage() {
  return (
    <ProtectedRoute>
      <CreateSessionContent />
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

function CreateSessionContent() {
  const { userData } = useAuth();
  const [selectedLord, setSelectedLord] = useState<string | null>(null);
  const [selectedFarer, setSelectedFarer] = useState<string | null>(userData?.preferredNightfarer || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [nightLords, setNightLords] = useState<NightLord[]>([]);
  const [nightfarers, setNightfarers] = useState<Nightfarer[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(true);
  
  // Character counter states
  const [sessionNameLength, setSessionNameLength] = useState(userData?.preferredSessionName?.length || 0);
  const [passwordLength, setPasswordLength] = useState(userData?.preferredSessionPassword?.length || 0);
  
  // Debounce timer reference
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      sessionName: userData?.preferredSessionName || "",
      password: userData?.preferredSessionPassword || "",
      sessionType: "regular"
    },
    mode: "onBlur", // Only validate on blur and submit for better UX
  });

  // Fetch nightlords and nightfarers on component mount
  useEffect(() => {
    // Clear all pending friend requests from sessionStorage
    clearFriendRequestState();
    const fetchData = async () => {
      try {
        setIsLoadingCharacters(true);
        
        // Check if user has an active session
        try {
          const activeSession = await sessionService.getActiveSession();
          
          if (activeSession) {
            setNotification({
              message: (
                <div>
                  You are already in an active session: &apos;{activeSession.name}&apos; (ID: {activeSession.id}) with status {activeSession.status}. 
                  <Link href={`/sessions/run?id=${activeSession.id}`} className="underline font-bold ml-1">
                    Click here
                  </Link> to go to your active session.
                </div>
              ),
              type: 'warning'
            });
          }
        } catch (error) {
          // Ignore errors checking for active sessions
          console.error("Error checking for active sessions:", error);
        }
        
        // Fetch characters
        const [lords, farers] = await Promise.all([
          fetchNightLords(),
          fetchNightfarers()
        ]);
        setNightLords(lords);
        setNightfarers(farers);
      } catch {
        setNotification({
          message: "Failed to load characters. Please refresh the page.",
          type: 'error'
        });
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    fetchData();
  }, []);
  
  // Update character counters whenever field values change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'sessionName' && value.sessionName) {
        setSessionNameLength(value.sessionName.length);
      }
      if (name === 'password' && value.password) {
        setPasswordLength(value.password.length);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, form.watch]);
  
  // Handle debounced validation
  const debouncedValidate = (fieldName: keyof SessionFormValues) => {
    // Clear any existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    // Set a new timeout
    const timeout = setTimeout(() => {
      form.trigger(fieldName);
    }, 500); // 500ms debounce
    
    setValidationTimeout(timeout);
  };
  
  const onSubmit = async (data: SessionFormValues) => {
    // Reset notification
    setNotification(null);
    
    // Validate character selections
    if (!selectedFarer) {
      setNotification({
        message: "Please select a Nightfarer",
        type: 'warning'
      });
      return;
    }
    
    if (!selectedLord) {
      setNotification({
        message: "Please select a Night Lord",
        type: 'warning'
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get region based on user settings
      const userRegion = userData?.autoRegion ? userData.cmRegion : userData?.region;
      
      if (!userRegion) {
        throw new Error("User region information is missing");
      }
      
      // Get platform from user data
      const userPlatform = userData?.platform;
      
      if (!userPlatform) {
        throw new Error("User platform information is missing");
      }
      
      // Sanitize inputs before submission
      const sessionData: CreateSessionParams = {
        gamePassword: data.password.trim(),
        name: data.sessionName.trim(),
        nightLord: selectedLord,
        nightfarer: selectedFarer,
        isPrivate: data.sessionType === "private",
        isFriendsOnly: data.sessionType === "friends-only",
        region: userRegion,
        platform: userPlatform
      };
      
      const responseData = await createSession(sessionData);
      
      setNotification({
        message: "Session created successfully!",
        type: 'success'
      });
      
      setTimeout(() => {
        router.push(`/sessions/run?id=${responseData.id}`);
      }, 1000); // Short delay to show success message
    } catch (error) {
      // Check if error message contains information about already being in a session
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      
      if (errorMessage.includes("You are already in an active session")) {
        // Extract session ID from the error message using regex
        const sessionIdMatch = errorMessage.match(/\(ID: ([a-f0-9]+)\)/i);
        const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
        
        if (sessionId) {
          setNotification({
            message: (
              <div>
                {errorMessage}. <Link href={`/sessions/run?id=${sessionId}`} className="underline font-bold">Click here</Link> to go to your active session.
              </div>
            ),
            type: 'warning'
          });
        } else {
          setNotification({
            message: errorMessage,
            type: 'warning'
          });
        }
      } else {
        setNotification({
          message: errorMessage,
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <MainLayout footer={<Footer />}>
      <div className="container max-w-2xl py-6 md:py-10 px-4 mx-auto">
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold">Create New Session</h1>
            <Button variant="outline" asChild className="h-10">
              <Link href="/sessions">Back to Sessions</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="sessionName"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel className="text-sm md:text-base font-medium">Session Name</FormLabel>
                          <span className={`text-xs ${sessionNameLength > 22 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {sessionNameLength} / 22
                          </span>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="Enter a name for your session" 
                            className="w-full h-10"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setSessionNameLength(e.target.value.length);
                              debouncedValidate('sessionName');
                            }}
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel className="text-sm md:text-base font-medium">In Game Password</FormLabel>
                          <span className={`text-xs ${passwordLength > 6 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {passwordLength} / 6
                          </span>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="Enter an in-game password" 
                            className="w-full h-10"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setPasswordLength(e.target.value.length);
                              debouncedValidate('password');
                            }}
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sessionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm md:text-base font-medium">Session Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder="Select session type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="regular">Regular Session</SelectItem>
                            <SelectItem value="friends-only">Friends Only</SelectItem>
                            <SelectItem value="private">Private Session</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs mt-1 text-muted-foreground">
                          {field.value === "friends-only" 
                            ? "Friends Only: Your session will only be visible to your friends in the Friends tab."
                            : field.value === "private"
                              ? "Private: Your session will be visible only to you. Share the session link with your friends to join."
                              : "Regular: Your session will be visible to all players in the general sessions list."}
                        </p>
                        <FormMessage className="text-xs sm:text-sm text-red-600 font-medium" />
                      </FormItem>
                    )}
                  />

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
                    {!selectedFarer && form.formState.isSubmitted && (
                      <p className="text-xs sm:text-sm text-red-600 font-medium mt-1">Please select a Nightfarer</p>
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
                    {!selectedFarer && form.formState.isSubmitted && (
                      <p className="text-xs sm:text-sm text-red-600 font-medium mt-1">Please select a Nightfarer</p>
                    )}
                  </div>

                  {/* Mobile: ComboBox for Night Lord selection */}
                  <div className="space-y-2 md:hidden">
                    <label className="text-sm md:text-base font-medium">
                      Select Night Lord
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
                    {!selectedLord && form.formState.isSubmitted && (
                      <p className="text-xs sm:text-sm text-red-600 font-medium mt-1">Please select a Night Lord</p>
                    )}
                  </div>

                  {/* Desktop: Grid for Night Lord selection */}
                  <div className="space-y-2 hidden md:block">
                    <label className="text-sm md:text-base font-medium">
                      Select Night Lord
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
                    {!selectedLord && form.formState.isSubmitted && (
                      <p className="text-xs sm:text-sm text-red-600 font-medium mt-1">Please select a Night Lord</p>
                    )}
                  </div>
                  
                  {/* Notification display area */}
                  {notification && (
                    <div className={`
                      flex items-center gap-2 text-sm p-3 rounded-md 
                      ${notification.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' : 
                      notification.type === 'warning' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                      'bg-green-100 text-green-700 border border-green-300'}
                    `}>
                      <AlertCircle size={16} className="flex-shrink-0" />
                      <span>{notification.message}</span>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button 
                      className="w-full h-10 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600" 
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating..." : "Create Session"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}