"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewsItem, fetchAdminNews, Announcement, updateAnnouncement, fetchAnnouncement } from "@/utils/api";
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
import { PlusIcon, Pencil, Trash2, AlertCircle, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  
  // Announcement state
  const [announcement, setAnnouncement] = useState<Announcement>({
    active: false,
    content: "New version of Covenant Match coming soon!",
    updatedAt: new Date().toISOString()
  });
  const [isAnnouncementLoading, setIsAnnouncementLoading] = useState(true);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  
  const { fetchWithAuth } = useAuth();

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      // Use the fetchAdminNews function which uses the admin-specific endpoint
      const newsItems = await fetchAdminNews();
      
      if (newsItems && newsItems.length >= 0) {
        setNews(newsItems);
      } else {
        throw new Error("Failed to fetch news items");
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

  const fetchAnnouncementData = async () => {
    setIsAnnouncementLoading(true);
    try {
      const data = await fetchAnnouncement();
      if (data) {
        setAnnouncement(data);
      }
    } catch (error) {
      console.error("Error fetching announcement:", error);
      setNotification({
        type: "error",
        message: "Failed to load announcement settings"
      });
    } finally {
      setIsAnnouncementLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchAnnouncementData();
  }, [fetchWithAuth]);

  const handleAnnouncementChange = (field: keyof Announcement, value: boolean | string) => {
    setAnnouncement(prev => ({
      ...prev,
      [field]: value,
      updated_at: new Date().toISOString()
    }));
  };

  const saveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    try {
      const success = await updateAnnouncement(announcement);
      if (success) {
        setNotification({
          type: "success",
          message: "Announcement settings updated successfully"
        });
      } else {
        throw new Error("Failed to update announcement");
      }
    } catch (error) {
      console.error("Error saving announcement:", error);
      setNotification({
        type: "error",
        message: "Failed to update announcement settings"
      });
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

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
    <div className="space-y-6">
      {notification && (
        <Notification
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Announcement Settings Section - made more responsive */}
      <Card className="mb-6">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle>Site Announcement</CardTitle>
              <CardDescription className="mt-1">
                Set a global announcement that will appear at the top of all pages
              </CardDescription>
            </div>
            <Button
              onClick={saveAnnouncement}
              disabled={isSavingAnnouncement}
              className="w-full sm:w-auto"
            >
              {isSavingAnnouncement ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {isAnnouncementLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="announcement-active"
                    checked={announcement.active}
                    onCheckedChange={(value) => handleAnnouncementChange("active", value)}
                  />
                  <Label htmlFor="announcement-active">Enable announcement</Label>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Bell className="h-4 w-4 mr-1" />
                  <span>Last updated: {typeof announcement.updatedAt === 'string' 
                    ? new Date(announcement.updatedAt).toLocaleString()
                    : new Date(parseInt(announcement.updatedAt.$date.$numberLong)).toLocaleString()}</span>
                </div>
              </div>
              <Textarea
                value={announcement.content}
                onChange={(e) => handleAnnouncementChange("content", e.target.value)}
                placeholder="Enter announcement text"
                className="min-h-[100px]"
              />
              
              {/* Preview */}
              <div className="border rounded-md p-3 bg-slate-50 dark:bg-slate-900">
                <div className="text-sm font-medium mb-1">Preview:</div>
                <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-3 rounded-md shadow-sm border border-purple-700">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-purple-300" />
                    <span className="font-semibold">Announcement:</span>
                    <span>{announcement.content}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* News Management Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold">News Articles</h1>
        <Link href="/admin/news/create">
          <Button className="flex items-center w-full sm:w-auto">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Article
          </Button>
        </Link>
      </div>

      {/* News Table with responsive design */}
      <div className="border rounded-md overflow-hidden">
        {news.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground">No news articles found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;Add New Article&quot; to create your first article
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {news.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>
                        {item.title}
                        <div className="md:hidden text-xs text-muted-foreground mt-1">
                          <div className="flex items-center">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                              item.published ? 'bg-green-500' : 'bg-amber-500'
                            }`}></span>
                            {item.published ? 'Published' : 'Draft'}
                          </div>
                          <div className="mt-1">{formatDate(item.created_at)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.published 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          item.published ? 'bg-green-400' : 'bg-amber-400'
                        }`}></span>
                        {item.published ? 'Published' : 'Draft'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link href={`/admin/news/edit/${item.id}`}>
                          <Button variant="outline" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this news article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <AlertDialogCancel className="mt-2 sm:mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 