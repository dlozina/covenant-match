'use client'
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Mock session ID - in a real app, this would come from the URL or props
const SESSION_ID = "28571";

export default function SessionResultsPage() {
  // State to track if session is finished and reporting is visible
  const [isSessionFinished, setIsSessionFinished] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  
  // Session timer states
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number | null>(null);
  
  // Store the final duration when session is finished
  const [finalDuration, setFinalDuration] = useState<number | null>(null);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  // Start the session timer
  const startSession = () => {
    if (isSessionStarted) return;
    
    // Reset any previous finished session
    setIsSessionFinished(false);
    setFinalDuration(null);
    
    // Set session as started
    setIsSessionStarted(true);
    
    // Record start time
    const startTime = Date.now();
    sessionStartTimeRef.current = startTime;
    lastSyncTimeRef.current = startTime;
    
    // Store in localStorage for persistence
    localStorage.setItem('sessionStartTime', startTime.toString());
    localStorage.setItem('sessionId', SESSION_ID);
    localStorage.removeItem('sessionFinished');
    
    // Start the timer interval
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (sessionStartTimeRef.current || now)) / 1000);
      setElapsedSeconds(elapsed);
      
      // Sync with server every 30 seconds
      if (lastSyncTimeRef.current && now - lastSyncTimeRef.current > 30000) {
        syncWithServer();
        lastSyncTimeRef.current = now;
      }
    }, 1000);
    
    // TODO: Send API request to start session on server
    // This would be an API call to your backend
    // Example: 
    // fetch('/api/sessions/start', {
    //   method: 'POST',
    //   body: JSON.stringify({ sessionId: SESSION_ID })
    // })
    // .then(response => response.json())
    // .then(data => {
    //   // Update with server timestamp if needed
    //   sessionStartTimeRef.current = data.startTimestamp;
    // });
  };

  // Sync timer with server
  const syncWithServer = () => {
    // TODO: Implement server sync
    // This would be an API call to get the current session time from your backend
    // Example:
    // fetch(`/api/sessions/${SESSION_ID}/elapsed`)
    //   .then(response => response.json())
    //   .then(data => {
    //     // Update elapsed time from server
    //     setElapsedSeconds(data.elapsedSeconds);
    //     // Adjust start time to maintain consistency
    //     sessionStartTimeRef.current = Date.now() - (data.elapsedSeconds * 1000);
    //   });
  };

  // Handle finish session
  const handleFinishSession = () => {
    // Store the final duration
    setFinalDuration(elapsedSeconds);
    
    // Update state
    setIsSessionFinished(true);
    setShowConfirmDialog(false);
    
    // Clear the timer interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Mark session as finished in localStorage
    localStorage.setItem('sessionFinished', 'true');
    localStorage.setItem('finalDuration', elapsedSeconds.toString());
    
    // TODO: Send API request to end session on server
    // Example:
    // fetch('/api/sessions/end', {
    //   method: 'POST',
    //   body: JSON.stringify({ 
    //     sessionId: SESSION_ID,
    //     duration: elapsedSeconds
    //   })
    // });
  };

  // Check for existing session on component mount
  useEffect(() => {
    const storedSessionId = localStorage.getItem('sessionId');
    const storedStartTime = localStorage.getItem('sessionStartTime');
    const sessionFinished = localStorage.getItem('sessionFinished') === 'true';
    const storedFinalDuration = localStorage.getItem('finalDuration');
    
    // If the session ID doesn't match, reset everything
    if (storedSessionId && storedSessionId !== SESSION_ID) {
      resetSession();
      return;
    }
    
    // If there's a finished session, just show the results
    if (sessionFinished && storedFinalDuration) {
      setIsSessionFinished(true);
      setFinalDuration(parseInt(storedFinalDuration, 10));
      setIsSessionStarted(true);
      return;
    }
    
    // Otherwise check for an active session
    if (storedStartTime) {
      const startTime = parseInt(storedStartTime, 10);
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      
      // If there's a stored session that's not too old (e.g., less than 3 hours)
      if (elapsed < 10800) {
        sessionStartTimeRef.current = startTime;
        setElapsedSeconds(elapsed);
        setIsSessionStarted(true);
        
        // Restart the timer
        timerIntervalRef.current = setInterval(() => {
          const currentTime = Date.now();
          const currentElapsed = Math.floor((currentTime - (sessionStartTimeRef.current || currentTime)) / 1000);
          setElapsedSeconds(currentElapsed);
          
          // Sync with server every 30 seconds
          const syncTime = lastSyncTimeRef.current || startTime;
          if (currentTime - syncTime > 30000) {
            syncWithServer();
            lastSyncTimeRef.current = currentTime;
          }
        }, 1000);
        
        // Sync with server immediately
        syncWithServer();
      } else {
        // Clear old session data
        resetSession();
      }
    }
    
    // Add beforeunload event listener to warn about active sessions
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSessionStarted && !isSessionFinished) {
        // Standard way to show a confirmation dialog when leaving the page
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Show warning dialog once when the page loads if there's an active session
    if (isSessionStarted && !isSessionFinished && !sessionFinished) {
      setShowWarningDialog(true);
    }
    
    // Cleanup interval and event listener on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Clear all session data from localStorage when component unmounts
      // This ensures a clean state when navigating away
      clearSessionData();
    };
  }, []);

  // Function to clear all session data from localStorage
  const clearSessionData = () => {
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('sessionFinished');
    localStorage.removeItem('finalDuration');
    localStorage.removeItem('sessionId');
  };

  // Reset session function
  const resetSession = () => {
    // Clear all session data
    clearSessionData();
    
    // Reset state
    setIsSessionStarted(false);
    setIsSessionFinished(false);
    setElapsedSeconds(0);
    setFinalDuration(null);
    
    // Clear any running timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    sessionStartTimeRef.current = null;
    lastSyncTimeRef.current = null;
  };

  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-10 mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg p-4 mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Nightreign Session Results</h1>
          <span className="text-muted-foreground">Session ID: {SESSION_ID}</span>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Players Section */}
            <Card>
              <CardHeader>
                <CardTitle>Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Player 1 (You) */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary">
                    <span>You</span>
                  </Avatar>
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
                    <div className="bg-secondary/50 px-3 py-2 rounded-md">
                      <span className="text-foreground">DarkKnight88</span>
                    </div>
                    <div className="bg-secondary/50 px-3 py-2 rounded-md">
                      <span className="text-foreground">Shadow Lord</span>
                    </div>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500 ml-auto">
                      Reported
                    </Badge>
                  </div>
                </div>

                {/* Player 2 */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary">
                    <span>P2</span>
                  </Avatar>
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
                    <div className="bg-secondary/50 px-3 py-2 rounded-md">
                      <span className="text-foreground">FrostQueen</span>
                    </div>
                    <div className="bg-secondary/50 px-3 py-2 rounded-md">
                      <span className="text-foreground">Ice Maiden</span>
                    </div>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500 ml-auto">
                      Reported
                    </Badge>
                  </div>
                </div>

                {/* Player 3 */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12 flex items-center justify-center bg-secondary">
                    <span>P3</span>
                  </Avatar>
                  <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2">
                    <div className="bg-secondary/50 px-3 py-2 rounded-md">
                      <span className="text-foreground">FlameWarrior</span>
                    </div>
                    <div className="bg-secondary/50 px-3 py-2 rounded-md">
                      <span className="text-foreground">Fire Knight</span>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground ml-auto">
                      Pending
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Control Buttons in separate card */}
            <Card className="mt-6">
              <CardContent className="py-6">
                {isSessionFinished ? (
                  <div className="space-y-4">
                    {/* Primary action button */}
                    <div className="flex">
                      <Button 
                        size="lg" 
                        className="flex-1 h-14 text-lg"
                        onClick={resetSession}
                      >
                        Start New Session With Same Team
                      </Button>
                    </div>
                    
                    {/* Navigation buttons - only shown after session is finished */}
                    <div className="flex gap-4">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        asChild
                      >
                        <Link href="/sessions">Back to Sessions</Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        asChild
                      >
                        <Link href="/sessions/create">Create New Session</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <Button 
                      size="lg" 
                      className="flex-1 h-14 text-lg"
                      onClick={startSession}
                      disabled={isSessionStarted}
                    >
                      {isSessionStarted ? 'Session Started' : 'Start Session'}
                    </Button>
                    <Button 
                      size="lg" 
                      variant="destructive" 
                      className="flex-1 h-14 text-lg"
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={!isSessionStarted || isSessionFinished}
                    >
                      Finish Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            {/* Report Your Result Section - Only shown after session is finished */}
            {isSessionFinished ? (
              <Card>
                <CardHeader>
                  <CardTitle>Report Your Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Result Options */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-20 bg-emerald-950 text-emerald-500 border-emerald-500 border-2 flex flex-col"
                    >
                      <span>WIN</span>
                      <span className="text-xs text-muted-foreground">Selected</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 bg-secondary/50 text-foreground"
                    >
                      LOSS
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 bg-secondary/50 text-foreground"
                    >
                      DRAW
                    </Button>
                  </div>

                  {/* Session Timer */}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Session Duration:</span>
                    <span className="text-foreground">{formatTime(finalDuration || elapsedSeconds)}</span>
                  </div>

                  {/* Rating Stars */}
                  <div>
                    <p className="text-muted-foreground mb-2">Rate Experience:</p>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star, index) => (
                        <button 
                          key={star} 
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            index < 3 ? 'bg-amber-500 text-white' : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button className="w-full">Submit Results</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Session Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Session Type:</span>
                      <span className="text-foreground">Standard (1v1)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Created By:</span>
                      <span className="text-foreground">DarkKnight88</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Time Limit:</span>
                      <span className="text-foreground">45 minutes</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge 
                        variant="outline" 
                        className={`${isSessionStarted 
                          ? "bg-amber-950/30 text-amber-500 border-amber-500" 
                          : "bg-secondary/50 text-muted-foreground border-muted-foreground"}`}
                      >
                        {isSessionStarted ? 'In Progress' : 'Not Started'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {isSessionStarted ? 'Session Duration:' : 'Time remaining:'}
                      </span>
                      <span className="text-foreground font-medium">
                        {isSessionStarted 
                          ? formatTime(elapsedSeconds)
                          : '45m 00s'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      {!isSessionStarted 
                        ? 'Click "Start Session" to begin the game timer.'
                        : 'Click "Finish Session" when you&apos;re ready to report your results.'}
                    </p>
                  </CardContent>
                </Card>
                {/* Empty space to match the height of the buttons card */}
                <div className="h-[102px] mt-6"></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Finish Session Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finish this session? You will be asked to report your results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinishSession}>
              Yes, Finish Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Warning Dialog about session state */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session State Warning</AlertDialogTitle>
            <AlertDialogDescription>
              Please note that if you navigate away from this page or refresh the browser, your session state will be lost. 
              It&apos;s recommended to complete your session before leaving this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>I Understand</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
} 