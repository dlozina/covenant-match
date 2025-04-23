"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatDistanceToNow } from "date-fns";
import { PlusIcon, Pencil, Trash2 } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  image_url?: string;
  author_id: string;
  author_username: string;
  updated_by_id: string;
  updated_by_username: string;
  published: boolean;
  created_at: {
    $date: {
      $numberLong: string;
    }
  };
  updated_at: {
    $date: {
      $numberLong: string;
    }
  };
  time_ago?: string;
}

// Define MongoDB date object type
interface MongoDBDate {
  $date: {
    $numberLong: string;
  };
}

// Helper function to safely format MongoDB date objects
const formatDate = (dateObj: MongoDBDate | string): string => {
  try {
    if (typeof dateObj === 'object' && dateObj.$date && dateObj.$date.$numberLong) {
      const timestamp = parseInt(dateObj.$date.$numberLong);
      if (!isNaN(timestamp)) {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
      }
    }
    return "Unknown date";
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Unknown date";
  }
};

export default function NewsListPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { fetchWithAuth } = useAuth();

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      interface NewsResponse {
        status: string;
        data: {
          news: NewsItem[];
          pagination?: {
            total: number;
            page: number;
            total_pages: number;
          };
        };
      }
      
      const data = await fetchWithAuth<NewsResponse>("/api/v1/news");
      
      // Check if data has the expected structure
      if (data && data.status === "success" && data.data && data.data.news) {
        setNews(data.data.news);
      } else {
        console.error("Unexpected response format:", data);
        throw new Error("Unexpected response format");
      }
    } catch (error) {
      console.error("Error fetching news:", error);
      setNotification({
        type: "error",
        message: "Failed to load news items"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [fetchWithAuth]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await fetchWithAuth(`/api/v1/admin/news/${deleteId}`, {
        method: "DELETE",
      });
      
      setNotification({
        type: "success",
        message: "News deleted successfully"
      });
      
      // Refresh the news list
      fetchNews();
    } catch (error) {
      console.error("Error deleting news:", error);
      setNotification({
        type: "error",
        message: "Failed to delete news"
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-md">
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <Skeleton className="h-6 w-2/3" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">News Management</h1>
        <Link href="/admin/news/create" passHref>
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add News
          </Button>
        </Link>
      </div>

      {notification && (
        <div className="mb-6">
          <Notification 
            notification={notification} 
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}

      {news.length === 0 && !isLoading ? (
        <div className="text-center py-10 border rounded-md">
          <p className="text-muted-foreground">No news posts found</p>
          <Link href="/admin/news/create" passHref>
            <Button variant="link">Create your first news post</Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {news.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {item.published ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <i className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1" />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          <i className="inline-block h-2 w-2 rounded-full bg-gray-500 mr-1" />
                          Draft
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.time_ago || formatDate(item.created_at)}
                  </TableCell>
                  <TableCell>
                    {formatDate(item.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/admin/news/preview/${item.id}`} passHref>
                        <Button variant="outline" size="icon" title="Preview">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </Button>
                      </Link>
                      <Link href={`/admin/news/edit/${item.id}`} passHref>
                        <Button variant="outline" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the news post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 