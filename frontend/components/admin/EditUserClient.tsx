"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Ban, UserX, Key} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  AdminUser, 
  UserService
} from "@/utils/api/user-service";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

interface EditUserClientProps {
  userId: string;
}

export function EditUserClient({ userId }: EditUserClientProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Fetch user data
  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const userData = await UserService.getAdminUserById(userId);
      setUser(userData);
    } catch (error) {
      console.error("Error fetching user:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load user"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUser();
  }, [userId]);

  const handleUpdateStatus = async (disabled: boolean) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const updatedUser = await UserService.updateUser(userId, { disabled });
      
      setNotification({
        type: "success",
        message: disabled ? "Account disabled successfully" : "Account activated successfully"
      });
      
      // Update local state with new user data
      setUser(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update user status"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = () => {
    router.push(`/admin/users/reset-password/${userId}`);
  };

  const handleDeleteUser = () => {
    router.push(`/admin/users?delete=${userId}`);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-36" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <User className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-4">We couldn&apos;t find the user you&apos;re looking for.</p>
        <Button onClick={() => router.push("/admin/users")}>
          Back to Users
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/admin/users")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">User Details</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          ID: {userId}
        </p>
      </div>
      
      {notification && (
        <Notification
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
      )}
      
      <Card className="overflow-hidden">
        <CardHeader>
          <CardDescription>
            @{user.username}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Basic Information</TabsTrigger>
              <TabsTrigger value="game">Game Information</TabsTrigger>
              <TabsTrigger value="settings">Account Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-6 pt-4">
              {/* Basics Section */}
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Username</Label>
                      <Input value={user.username} readOnly className="bg-muted/50 mt-2" />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Input value={user.role} readOnly className="bg-muted/50 mt-2" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input value={user.email} readOnly className="bg-muted/50 mt-2" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Created</Label>
                      <Input 
                        value={typeof user.createdAt === 'string' 
                          ? new Date(user.createdAt).toLocaleString() 
                          : new Date(parseInt(user.createdAt.$date.$numberLong)).toLocaleString()} 
                        readOnly 
                        className="bg-muted/50 mt-2" 
                      />
                    </div>
                    <div>
                      <Label>Last Updated</Label>
                      <Input 
                        value={typeof user.updatedAt === 'string' 
                          ? new Date(user.updatedAt).toLocaleString() 
                          : new Date(parseInt(user.updatedAt.$date.$numberLong)).toLocaleString()} 
                        readOnly 
                        className="bg-muted/50 mt-2" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="game" className="space-y-6 pt-4">
              {/* Game Settings Section */}
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Region</Label>
                      <Input value={user.region || "Not set"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                    <div>
                      <Label>Platform</Label>
                      <Input value={user.platform || "Not set"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Auto Region Detection</Label>
                      <Input value={user.autoRegion ? "Enabled" : "Disabled"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                    <div>
                      <Label>Detected Covenant-Match Region</Label>
                      <Input value={user.cmRegion || "Unknown"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Covenant Name</Label>
                      <Input value={user.covenantName || "Not set"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                    <div>
                      <Label>Cloudflare Region</Label>
                      <Input value={user.cfRegion || "Unknown"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-6 pt-4">
              {/* User Settings & Preferences */}
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Preferred Session Name</Label>
                      <Input value={user.preferredSessionName || "Not set"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                    <div>
                      <Label>Preferred Session Password</Label>
                      <Input value={user.preferredSessionPassword || "Not set"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Preferred Nightfarer</Label>
                      <Input value={user.preferredNightfarer || "Not set"} readOnly className="bg-muted/50 mt-2" />
                    </div>
                    <div>
                      <Label>Disable Account</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch 
                          checked={user.disabled}
                          onCheckedChange={(checked) => handleUpdateStatus(checked)}
                          disabled={isSubmitting}
                        />
                        <span className={user.disabled ? "text-red-600" : "text-green-600"}>
                          {user.disabled ? "Disabled" : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card className="border-destructive/20">
        <CardHeader className="text-destructive">
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Administrative actions that require caution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline"
              className="gap-2"
              onClick={handleResetPassword}
            >
              <Key className="h-4 w-4" />
              Reset Password
            </Button>
            <Button 
              variant="outline" 
              className={`gap-2 ${user.disabled ? "border-destructive text-destructive hover:bg-destructive/10" : ""}`}
              onClick={() => handleUpdateStatus(!user.disabled)}
              disabled={isSubmitting}
            >
              <Ban className="h-4 w-4" />
              {user.disabled ? "Enable Account" : "Disable Account"}
            </Button>
            <Button 
              variant="destructive" 
              className="gap-2"
              onClick={handleDeleteUser}
            >
              <UserX className="h-4 w-4" />
              Delete User
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 