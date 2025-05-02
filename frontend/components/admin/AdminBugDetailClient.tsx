"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Notification, NotificationType } from "@/components/ui/notification";
import { formatDate, BugReport, BugService } from "@/utils/api/bug-service";
import { Bug, ChevronLeft, User, Monitor, Calendar } from "lucide-react";

interface AdminBugDetailClientProps {
  bugId: string;
}

export function AdminBugDetailClient({ bugId }: AdminBugDetailClientProps) {
  const [bugReport, setBugReport] = useState<BugReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const router = useRouter();

  const loadBugReport = async () => {
    setIsLoading(true);
    try {
      const response = await BugService.getBugReportById(bugId);
      if (response.status === "success" && response.data.bug) {
        setBugReport(response.data.bug);
      } else {
        throw new Error("Failed to load bug report");
      }
    } catch (error) {
      console.error("Error loading bug report:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load bug report"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (bugId) {
      loadBugReport();
    }
  }, [bugId]);

  const clearNotification = () => {
    setNotification(null);
  };

  const handleBack = () => {
    router.back();
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Bug Report Details</h2>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If bug report not found
  if (!bugReport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Bug Report Details</h2>
        </div>

        <Card className="p-6 text-center">
          <div className="flex flex-col items-center">
            <Bug className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Bug report not found</p>
            <Button onClick={handleBack}>Go back</Button>
          </div>
        </Card>

        {notification && (
          <Notification
            notification={notification}
            onDismiss={clearNotification}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Bug Report Details</h2>
        </div>
      </div>

      {notification && (
        <Notification
          notification={notification}
          onDismiss={clearNotification}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{bugReport.title}</CardTitle>
              <CardDescription>
                Bug report ID: {bugReport.id}
              </CardDescription>
            </div>
            <Badge variant="outline" className="ml-2">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              {formatDate(bugReport.created_at)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-4 w-4 mr-2" />
                <span>Reported by:</span>
              </div>
              <div className="font-medium">{bugReport.user_name}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Monitor className="h-4 w-4 mr-2" />
                <span>Device:</span>
              </div>
              <div className="font-medium">{bugReport.device}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
            <div className="p-4 bg-muted/30 rounded-md whitespace-pre-wrap">
              {bugReport.description}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleBack} variant="outline">
            Back to Bug Reports
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 