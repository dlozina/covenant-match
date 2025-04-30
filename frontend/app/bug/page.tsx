"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bug } from "lucide-react";

import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createBugReport, CreateBugReportDto } from "@/utils/api";
import { useAuth } from "@/lib/auth-context";
import { Notification, NotificationType } from "@/components/ui/notification";

// Zod schema for form validation
const bugReportSchema = z.object({
  title: z.string().min(5, {
    message: "Title must be at least 5 characters",
  }).max(100, { 
    message: "Title cannot exceed 100 characters" 
  }),
  device: z.string().min(2, {
    message: "Device information is required",
  }).max(100, { 
    message: "Device cannot exceed 100 characters" 
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters",
  }).max(1000, { 
    message: "Description cannot exceed 1000 characters" 
  }),
});

type BugReportFormValues = z.infer<typeof bugReportSchema>;

export default function BugReportPage() {
  const router = useRouter();
  const { isLoggedIn: isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  
  // Character counter states
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [titleLength, setTitleLength] = useState(0);
  const [deviceLength, setDeviceLength] = useState(0);

  // Initialize form with react-hook-form
  const form = useForm<BugReportFormValues>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: {
      title: "",
      device: "",
      description: "",
    },
  });

  // Function to clear notification
  const clearNotification = () => {
    setNotification(null);
  };

  // Handle form submission
  const onSubmit = async (data: BugReportFormValues) => {
    if (!isAuthenticated) {
      setNotification({
        message: "Authentication required. Please log in to report bugs",
        type: "error",
      });
      router.push("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      const bugReportData: CreateBugReportDto = {
        title: data.title,
        device: data.device,
        description: data.description,
      };

      await createBugReport(bugReportData);
      
      setNotification({
        message: "Thank you for your feedback! I will look into this issue.",
        type: "success",
      });
      
      // Reset the form
      form.reset();
      
      // Redirect to home page after successful submission
      router.push("/");
    } catch (error) {
      console.error("Error submitting bug report:", error);
      setNotification({
        message: error instanceof Error ? error.message : "Failed to submit bug report",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Report a Bug</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users
  if (!isAuthenticated && !isLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Report a Bug</h1>
        <div className="bg-destructive/20 border border-destructive rounded-md p-4 mb-6">
          <p className="text-center text-destructive-foreground">
            You must be logged in to report bugs. 
            <Button 
              variant="link" 
              className="text-primary underline ml-2"
              onClick={() => router.push("/login")}
            >
              Sign in
            </Button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Bug className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Report a Bug</h1>
      </div>
      
      <div className="bg-card border rounded-lg shadow-sm p-6">
        <p className="text-muted-foreground mb-6">
          Help me improve the covenent match by reporting any issues you encounter. Please provide as much detail as possible
          to help me understand and fix the problem.
        </p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Bug Title</FormLabel>
                    <span className={`text-xs ${titleLength > 100 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {titleLength} / 100
                    </span>
                  </div>
                  <FormDescription>
                    Concisely describe the issue you&apos;re experiencing
                  </FormDescription>
                  <FormControl>
                    <Input 
                      placeholder="Brief description of the issue" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        setTitleLength(e.target.value.length);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="device"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Device / Environment</FormLabel>
                    <span className={`text-xs ${deviceLength > 100 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {deviceLength} / 100
                    </span>
                  </div>
                  <FormDescription>
                    What device, browser, or platform were you using?
                  </FormDescription>
                  <FormControl>
                    <Input 
                      placeholder="e.g., iPhone 13 Pro, Chrome on Windows 11, etc." 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        setDeviceLength(e.target.value.length);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Bug Description</FormLabel>
                    <span className={`text-xs ${descriptionLength > 1000 ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {descriptionLength} / 1000
                    </span>
                  </div>
                  <FormDescription>
                    Include steps to reproduce, expected behavior, and actual behavior
                  </FormDescription>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of what happened and how to reproduce it" 
                      className="h-32 min-h-32"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setDescriptionLength(e.target.value.length);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notification display area */}
            <Notification 
              notification={notification} 
              onDismiss={clearNotification}
            />
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="min-w-[120px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Submitting...
                  </>
                ) : "Submit Report"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
