"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Switch } from "@/components/ui/switch";
import { 
  AdminUser, 
  UpdateUserParams,
  UserService
} from "@/utils/api/user-service";

// User Edit form schema
const userEditSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  display_name: z.string().min(2, "Display name must be at least 2 characters"),
  active: z.boolean().default(true),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

interface EditUserClientProps {
  userId: string;
}

export function EditUserClient({ userId }: EditUserClientProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // Initialize form
  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      email: "",
      display_name: "",
      active: true,
    },
  });
  
  // Fetch user data
  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const userData = await UserService.getAdminUserById(userId);
      setUser(userData);
      
      // Set form values
      form.reset({
        email: userData.email,
        display_name: userData.display_name,
        active: userData.active,
      });
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
  
  const onSubmit = async (values: UserEditFormValues) => {
    setIsSubmitting(true);
    try {
      const updatedUser = await UserService.updateUser(userId, values);
      
      setNotification({
        type: "success",
        message: "User updated successfully"
      });
      
      // Update local state with new user data
      setUser(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update user"
      });
    } finally {
      setIsSubmitting(false);
    }
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
          <h2 className="text-3xl font-bold tracking-tight">Edit User</h2>
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
      
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Update {user.username}&apos;s profile information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Username</FormLabel>
                    <Input value={user.username} disabled className="bg-muted/50" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Username cannot be changed
                    </p>
                  </div>
                  
                  <div>
                    <FormLabel>Role</FormLabel>
                    <Input value={user.role} disabled className="bg-muted/50" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Role is managed via specific admin actions
                    </p>
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        This is the user&apos;s public display name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormDescription>
                        The user&apos;s email address for notifications and account recovery
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Account Status
                        </FormLabel>
                        <FormDescription>
                          {field.value ? 
                            "Account is active and user can login" : 
                            "Account is disabled and user cannot login"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push("/admin/users")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !form.formState.isDirty}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="border-destructive/20">
        <CardHeader className="text-destructive">
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            Additional actions that require caution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="destructive" 
              onClick={() => router.push(`/admin/users/reset-password/${userId}`)}
            >
              Reset Password
            </Button>
            <Button 
              variant="outline" 
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => router.push(`/admin/users?delete=${userId}`)}
            >
              Delete User
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 