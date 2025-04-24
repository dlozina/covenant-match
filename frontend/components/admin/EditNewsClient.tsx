"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NewsForm } from "@/components/admin/NewsForm";
import { useAuth } from "@/lib/auth-context";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsItem, fetchAdminNewsById } from "@/utils/api";

interface EditNewsClientProps {
  id: string;
}

export function EditNewsClient({ id }: EditNewsClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  const router = useRouter();
  const { fetchWithAuth } = useAuth();

  // Fetch the news item
  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Use the admin-specific API endpoint to fetch the news, which handles drafts too
        const data = await fetchAdminNewsById(id);
        if (!data) {
          throw new Error("Failed to fetch news item");
        }
        setNews(data);
      } catch (error) {
        console.error("Error fetching news:", error);
        setNotification({
          type: "error",
          message: "Failed to load news item"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [id]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    
    try {
      // Check if we have an image file
      const hasImage = formData.has("image") && formData.get("image") instanceof File;
      
      if (hasImage) {
        // If we have an image, use FormData directly
        await fetchWithAuth(`/api/v1/admin/news/${id}/multipart`, {
          method: "PUT",
          body: formData,
        });
      } else {
        // If no image, convert to JSON
        const updateData = {
          title: formData.get("title") as string,
          content: formData.get("content") as string,
          summary: formData.get("summary") as string,
          published: formData.get("published") === "true"
        };
        
        await fetchWithAuth(`/api/v1/admin/news/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });
      }
      
      setNotification({
        type: "success",
        message: "News updated successfully"
      });
      
      // Redirect back to news list after a short delay
      setTimeout(() => {
        router.push("/admin/news");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error("Error updating news:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update news"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Edit News</h1>
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          Failed to load news item. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Edit News</h1>
      
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
        initialData={news}
        onNotification={setNotification}
      />
    </div>
  );
} 