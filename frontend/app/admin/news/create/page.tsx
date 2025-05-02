"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NewsForm } from "@/components/admin/NewsForm";
import { Notification, NotificationType } from "@/components/ui/notification";
import { useAuth } from "@/lib/auth-context";

export default function CreateNewsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const router = useRouter();
  const { fetchWithAuth } = useAuth();

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Send the form data to the API
      await fetchWithAuth('/api/v1/admin/news', {
        method: 'POST',
        body: formData,
      });
      
      // Success
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