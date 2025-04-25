"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AdminSessionService } from "@/utils/api/admin-session-service";
import { AdminSession } from "./AdminSessionsClient";
import { format } from "date-fns";

interface AdminSessionViewClientProps {
  sessionId: string;
}

export function AdminSessionViewClient({ sessionId }: AdminSessionViewClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      
      // Check if sessionId is valid
      if (!sessionId || sessionId === "undefined") {
        console.error("Invalid session ID:", sessionId);
        setNotification({
          type: "error",
          message: "Invalid session ID provided",
        });
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await AdminSessionService.getSession(sessionId);
        setSession(response.data);
      } catch (error) {
        console.error("Error fetching session:", error);
        setNotification({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to load session details",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  // Handle session deletion
  const handleDeleteSession = async () => {
    try {
      await AdminSessionService.deleteSession(sessionId);
      setNotification({
        type: "success",
        message: "Session deleted successfully",
      });
      // Redirect back to sessions list after successful deletion
      setTimeout(() => {
        router.push("/admin/sessions");
      }, 1500);
    } catch (error) {
      console.error("Error deleting session:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete session",
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    try {
      // Handle numeric string from MongoDB date format
      if (!isNaN(Number(dateString))) {
        const timestamp = parseInt(dateString);
        if (!isNaN(timestamp)) {
          const date = new Date(timestamp);
          return format(date, "PPpp"); // Format with date and time
        }
      }
      
      // Try to parse as ISO string
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Unknown date";
      return format(date, "PPpp"); // Format with date and time
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Get result color
  const getResultColor = (result: string): string => {
    switch (result) {
      case "Win":
        return "text-green-600 dark:text-green-400 font-semibold";
      case "Loss":
        return "text-red-600 dark:text-red-400 font-semibold";
      case "Disconnect":
        return "text-yellow-600 dark:text-yellow-400 font-semibold";
      default:
        return "";
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open":
        return <Badge className="bg-green-500 hover:bg-green-500">Open</Badge>;
      case "Full":
        return <Badge className="bg-yellow-500 hover:bg-yellow-500">Full</Badge>;
      case "InProgress":
        return <Badge className="bg-blue-500 hover:bg-blue-500">In Progress</Badge>;
      case "Completed":
        return <Badge className="bg-purple-500 hover:bg-purple-500">Completed</Badge>;
      case "Cancelled":
        return <Badge className="bg-red-500 hover:bg-red-500">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-500">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-full max-w-md mb-2" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Session Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">The session you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
            <Button
              onClick={() => router.push("/admin/sessions")}
              className="mt-4"
            >
              Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Find host player
  const hostPlayer = session.joinedPlayers.find(p => p.userId === session.hostId);

  return (
    <div className="container mx-auto p-4">
      {notification && (
        <div className="mb-4">
          <Notification
            notification={notification}
            onDismiss={() => setNotification(null)}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Session Details</h1>
        </div>
        <Button
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Session
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{session.name}</span>
            <div className="flex items-center gap-3">
              {session.isPrivate && (
                <Badge variant="outline">Private</Badge>
              )}
              {getStatusBadge(session.status)}
            </div>
          </CardTitle>
          <CardDescription>
            Session ID: {session.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Session Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Host</p>
                <p>{hostPlayer?.username || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Night Lord</p>
                <p>{session.nightLord}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Region</p>
                <p>{session.region}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Platform</p>
                <p>{session.platform}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Password</p>
                <p>{session.password || "None"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Stats Updated</p>
                <p>{session.statsUpdated ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Timestamps</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p>{formatDate(session.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p>{formatDate(session.updatedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Started</p>
                <p>{formatDate(session.startedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p>{formatDate(session.completedAt)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Players */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Players ({session.joinedPlayers.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Nightfarer</TableHead>
                  <TableHead>Covenant</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Joined At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.joinedPlayers.map((player) => (
                  <TableRow key={player.userId}>
                    <TableCell className="font-medium">
                      {player.username}
                      {player.userId === session.hostId && (
                        <Badge className="ml-2 bg-purple-500 hover:bg-purple-500">Host</Badge>
                      )}
                    </TableCell>
                    <TableCell>{player.nightfarer}</TableCell>
                    <TableCell>{player.covenantName}</TableCell>
                    <TableCell>{player.region}</TableCell>
                    <TableCell>{player.platform}</TableCell>
                    <TableCell>{formatDate(player.joinedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Results */}
          {session.results && session.results.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Results ({session.results.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.results.map((result) => {
                    const player = session.joinedPlayers.find(
                      (p) => p.userId === result.userId
                    );
                    return (
                      <TableRow key={result.userId}>
                        <TableCell>{player?.username || result.userId}</TableCell>
                        <TableCell className={getResultColor(result.result)}>
                          {result.result}
                        </TableCell>
                        <TableCell>{result.rating !== null ? result.rating : "N/A"}</TableCell>
                        <TableCell>{result.feedback || "N/A"}</TableCell>
                        <TableCell>{formatDate(result.submittedAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/sessions")}
          >
            Back to All Sessions
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the session &quot;{session.name}&quot; and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSession} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 