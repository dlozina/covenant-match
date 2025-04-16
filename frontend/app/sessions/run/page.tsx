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
  SessionParticipant
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
  // In a real implementation, this would determine the role based on authentication
  // and session data. For now, showing both components for demonstration.
  return (
    <div className="space-y-6">
      <SessionHost />
      <SessionParticipant />
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
  
  // Function to clear notification
  const clearNotification = () => {
    setNotification(null);
  };
  
  const router = useRouter();
  
  // Redirect if session ID is invalid
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
  }, [isValidSessionId, router]);
  
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
          
          {notification && (
            <Notification 
              notification={notification} 
              onDismiss={clearNotification}
              className="mb-4"
            />
          )}
          
          <ParticipantOrHostView />
        </SessionEventManager>
      </div>
    </MainLayout>
  );
}