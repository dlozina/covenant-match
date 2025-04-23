"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft, Pencil, ExternalLink, Newspaper } from "lucide-react";
import { NewsItem } from "@/utils/api";
import Link from "next/link";
import { SecureImage } from "@/components/ui/secure-image";

interface NewsPreviewClientProps {
  id: string;
}

export function NewsPreviewClient({ id }: NewsPreviewClientProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [news, setNews] = useState<NewsItem | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  const router = useRouter();
  const { fetchWithAuth } = useAuth();

  // Format date for display
  const formatDate = (dateString: string | { $date: { $numberLong: string } }) => {
    try {
      if (typeof dateString === 'object' && dateString.$date && dateString.$date.$numberLong) {
        const timestamp = parseInt(dateString.$date.$numberLong);
        if (!isNaN(timestamp)) {
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(new Date(timestamp));
        }
      }
      
      // Handle string dates
      const date = new Date(typeof dateString === 'string' ? dateString : Date.now());
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Fetch the news item
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await fetchWithAuth<NewsItem>(`/api/v1/news/${id}`);
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
  }, [id, fetchWithAuth]);

  if (isLoading) {
    return (
      <div className="container py-10">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-6">News Preview</h1>
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
          Failed to load news item. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">News Preview</h1>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => router.push("/admin/news")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News List
          </Button>
          
          <Button 
            variant="default"
            onClick={() => router.push(`/admin/news/edit/${news.id}`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit News
          </Button>
          
          {news.published && (
            <Link href={`/news/${news.id}`} target="_blank" passHref>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Published
              </Button>
            </Link>
          )}
        </div>
      </div>
      
      {notification && (
        <div className="mb-6">
          <Notification 
            notification={notification}
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}
      
      {/* Status badge */}
      <div className="mb-6">
        {news.published ? (
          <span className="inline-flex items-center rounded-full bg-green-100/10 px-3 py-1 text-sm font-medium text-green-400">
            <i className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2" />
            Published
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100/10 px-3 py-1 text-sm font-medium text-gray-400">
            <i className="inline-block h-2 w-2 rounded-full bg-gray-500 mr-2" />
            Draft (Only visible to admins)
          </span>
        )}
      </div>

      <div className="border border-purple-900/20 bg-card/50 p-6 rounded-lg shadow-sm">
        {/* Featured image */}
        {news.image_url && (
          <div className="mb-8 h-72 relative rounded-lg overflow-hidden border border-purple-900/30">
            <SecureImage 
              src={news.image_url} 
              alt={news.title}
              fill
              className="object-cover"
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-slate-800/50">
                  <Newspaper className="h-16 w-16 text-purple-400/60" />
                </div>
              }
            />
          </div>
        )}

        {/* News title and meta */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-4">{news.title}</h1>
          <div className="flex items-center text-muted-foreground mb-2">
            <Calendar className="mr-2 h-4 w-4" />
            <span>Published on {formatDate(news.created_at)}</span>
          </div>
          <div className="text-muted-foreground">
            By {news.author_username}
          </div>
        </div>

        {/* Summary */}
        <div className="mb-8 text-xl text-purple-300 italic border-l-4 border-purple-500 pl-4 py-2 bg-purple-900/10 rounded-r-md">
          {news.summary}
        </div>

        {/* Content */}
        <div className="prose prose-lg prose-invert max-w-none">
          {news.content.split('\n').map((paragraph, index) => (
            paragraph.trim() ? <p key={index}>{paragraph}</p> : <br key={index} />
          ))}
        </div>
      </div>
    </div>
  );
} 