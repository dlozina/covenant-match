"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NewsForm } from "@/components/admin/NewsForm";
import { useAuth } from "@/lib/auth-context";
import { Notification, NotificationType } from "@/components/ui/notification";

export default function CreateNewsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const router = useRouter();
  const { fetchWithAuth } = useAuth();

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetchWithAuth("/api/v1/admin/news", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header when using FormData
        // The browser will set it automatically with the correct boundary
      });
      
      // Success - we already have the JSON response from fetchWithAuth
      setNotification({
        type: "success",
        message: "News created successfully"
      });
      
      // Redirect back to news list after a short delay
      setTimeout(() => {
        router.push("/admin/news");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Error creating news:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create news"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Create News</h1>
      
      {notification && (
        <div className="mb-6">
          <Notification 
            notification={notification} 
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}
      
      <NewsForm 
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        onNotification={setNotification}
      />
    </div>
  );
} 