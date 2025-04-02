"use client";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { fetchNightLords, fetchNightfarers, NightLord, Nightfarer } from "@/utils/api";

// Type for our notification state
type NotificationType = {
  message: string;
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
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function CreateSessionPage() {
  return (
    <ProtectedRoute>
      <CreateSessionContent />
    </ProtectedRoute>
  );
}

function CreateSessionContent() {
  const [selectedLord, setSelectedLord] = useState<string | null>(null);
  const [selectedFarer, setSelectedFarer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [nightLords, setNightLords] = useState<NightLord[]>([]);
  const [nightfarers, setNightfarers] = useState<Nightfarer[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState<boolean>(true);
  
  // Character counter states
  const [sessionNameLength, setSessionNameLength] = useState(0);
  const [passwordLength, setPasswordLength] = useState(0);
  
  // Debounce timer reference
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const router = useRouter();
  
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      sessionName: "",
      password: "",
    },
    mode: "onBlur", // Only validate on blur and submit for better UX
  });

  // Fetch nightlords and nightfarers on component mount
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setIsLoadingCharacters(true);
        const [lords, farers] = await Promise.all([
          fetchNightLords(),
          fetchNightfarers()
        ]);
        setNightLords(lords);
        setNightfarers(farers);
      } catch (error) {
        setNotification({
          message: "Failed to load characters. Please refresh the page.",
          type: 'error'
        });
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    fetchCharacters();
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
  }, [form.watch]);
  
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
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const token = localStorage.getItem('token');
      
      // Sanitize inputs before submission
      const sanitizedData = {
        gamePassword: data.password.trim(),
        name: data.sessionName.trim(),
        nightLord: selectedLord,
        nightfarer: selectedFarer,
        isPrivate: false
      };
      
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sanitizedData),
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        setNotification({
          message: "Session created successfully!",
          type: 'success'
        });
        setTimeout(() => {
          router.push(`/sessions/run?id=${responseData.id}`);
        }, 1000); // Short delay to show success message
      } else {
        throw new Error(responseData.message || "Failed to create session");
      }
    } catch (error) {
      setNotification({
        message: error instanceof Error ? error.message : "An unexpected error occurred",
        type: 'error'
      });
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
                            placeholder="Enter an in-game password for your session" 
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

                  <div className="space-y-2">
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

                  <div className="space-y-2">
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
                      className="w-full h-10" 
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