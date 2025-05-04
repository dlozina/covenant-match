'use client'
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { 
  SessionEventManager,
  SessionHeader,
  SessionHost,
  SessionParticipant,
  SessionChat,
  useSessionContext
} from "@/components/session";
import { Notification, NotificationType } from "@/components/ui/notification";

export default function SessionRunPage(): JSX.Element {
  return (
    <ProtectedRoute>
      <SessionRunContent />
    </ProtectedRoute>
  );
}

// Helper component to determine if user is host or participant
function ParticipantOrHostView(): JSX.Element {
  // Get the isHost function from session context
  const { isHost } = useSessionContext();
  
  // Render SessionHost for hosts, SessionParticipant for participants
  // We know that the user is either a host or a participant, from the session context
  return (
    <div className="space-y-6">
      {isHost() ? <SessionHost /> : <SessionParticipant />}
    </div>
  );
}

function SessionRunContent(): JSX.Element {
  // Get session ID from query parameters
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id') || "unknown";
  
  // Check if session ID is valid
  const isValidSessionId = sessionId !== "unknown" && sessionId.length > 0;
  
  // State for notifications
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // Flag to track if we've shown a cancellation notification
  const [hasShownCancelNotification, setHasShownCancelNotification] = useState<boolean>(false);
  
  // Function to clear notification
  const clearNotification = () => {
    setNotification(null);
  };
  
  const router = useRouter();
  
  // Redirect if session ID is invalid and handle session cancellation
  useEffect(() => {
    if (!isValidSessionId) {
      setNotification({
        message: "Invalid session ID. Please check the URL and try again.",
        type: "error"
      });
      
      // Redirect to sessions page after a delay
      const redirectTimer = setTimeout(() => {
        router.push('/sessions');
      }, 3000);
      
      return () => {
        clearTimeout(redirectTimer);
      };
    }
    
    // Check for session cancellation flag
    const wasSessionCancelled = sessionStorage.getItem('sessionCancelled');
    if (wasSessionCancelled === 'true') {
      // Get session name if available
      const sessionName = sessionStorage.getItem('cancelledSessionName') || 'Session';
      const cancelTimestamp = sessionStorage.getItem('cancelTimestamp');
      const cancelledSessionId = sessionStorage.getItem('cancelledSessionId');
      
      // If this is a different session than the one that was cancelled, clear cancellation data
      if (cancelledSessionId && cancelledSessionId !== sessionId) {
        console.log('In a different session than the cancelled one, clearing cancellation data');
        sessionStorage.removeItem('sessionCancelled');
        sessionStorage.removeItem('cancelledSessionName');
        sessionStorage.removeItem('cancelTimestamp');
        sessionStorage.removeItem('cancelledSessionId');
        // Reset notification flag
        setHasShownCancelNotification(false);
        return;
      }
      
      // Only show notification if it was stored recently (within the last 30 seconds)
      // AND we haven't already shown a cancellation notification
      const now = Date.now();
      const isRecentCancellation = cancelTimestamp && 
                                 (now - parseInt(cancelTimestamp, 10)) < 30000;
      
      if (isRecentCancellation && !hasShownCancelNotification) {
        setNotification({
          message: `Host canceled "${sessionName}"`,
          type: "warning"
        });
        
        // Mark that we've shown the notification
        setHasShownCancelNotification(true);
        
        // Redirect to sessions page after showing the notification
        const redirectTimer = setTimeout(() => {
          router.push('/sessions');
        }, 3000);
        
        return () => {
          clearTimeout(redirectTimer);
        };
      } else {
        // Just clear old cancellation data without showing notification
        sessionStorage.removeItem('sessionCancelled');
        sessionStorage.removeItem('cancelledSessionName');
        sessionStorage.removeItem('cancelTimestamp');
        sessionStorage.removeItem('cancelledSessionId');
      }
    }
    
    // No event listener for cancellation events anymore - using only the storage approach
  }, [isValidSessionId, router, sessionId, hasShownCancelNotification]);
  
  if (!isValidSessionId) {
    return (
      <MainLayout footer={<Footer />}>
        <div className="container py-10 mx-auto">
          <Notification 
            notification={{
              message: "Invalid session ID. Please check the URL and try again.",
              type: "error"
            }}
            onDismiss={clearNotification}
          />
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-10 mx-auto">  
        <SessionEventManager sessionId={sessionId}>
          <SessionHeader title={`Session #${sessionId}`} />
          {/* Show the host or participant view based on the role */}
          <ParticipantOrHostView />
          {notification && (
            <Notification 
              notification={notification} 
              onDismiss={clearNotification}
              className="mb-4"
            />
          )}
          {/* Chat is available to everyone regardless of role */}
          <SessionChat />
        </SessionEventManager>
      </div>
    </MainLayout>
  );
}