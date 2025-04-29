"use client";

import { useState, useEffect, useMemo } from "react";
import { Notification, NotificationType } from "@/components/ui/notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Search, Pencil, Trash2, Users, UserPlus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { 
  AdminUser, 
  UsersPaginationResponse,
  UserService
} from "@/utils/api/user-service";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fetchGameData, GameData } from "@/utils/api";

// Helper function to safely format MongoDB date objects
const formatDate = (dateObj: string | { $date: { $numberLong: string } }): string => {
  try {
    if (typeof dateObj === 'object' && dateObj.$date && dateObj.$date.$numberLong) {
      const timestamp = parseInt(dateObj.$date.$numberLong);
      if (!isNaN(timestamp)) {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
      }
    }
    if (typeof dateObj === 'string') {
      return formatDistanceToNow(new Date(dateObj), { addSuffix: true });
    }
    return "Unknown date";
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Unknown date";
  }
};

// Admin user creation form schema
const adminUserSchema = z.object({
  username: z.string().min(4, "Username must be at least 4 characters"),
  email: z.string().email("Must be a valid email address"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(8, "Confirm password must be at least 8 characters"),
  region: z.string().optional(),
  platform: z.string().optional(),
  covenantName: z.string().min(1, "Covenant name is required"),
  experience: z.string().min(1, "Experience is required"),
  disabled: z.boolean().default(false),
  autoRegion: z.boolean().default(true),
  role: z.enum(["admin", "user"]).default("admin"),
}).refine(data => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

export function AdminUsersClient() {
  const [activeTab, setActiveTab] = useState("users-list");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<UsersPaginationResponse>({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const router = useRouter();
  
  // Game data state
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoadingGameData, setIsLoadingGameData] = useState(true);

  // Memoized region and platform options
  const REGIONS = useMemo(() => 
    gameData?.regions?.map(r => r.description) || ["North America", "Europe", "Asia", "Oceania", "South America", "Africa", "Middle East"],
  [gameData]);
  
  const PLATFORMS = useMemo(() => 
    gameData?.platforms?.map(p => p.name) || ["PlayStation", "Xbox", "PC"],
  [gameData]);
  
  const COVENANTS = useMemo(() => 
    gameData?.covenants?.map(c => c.name) || ["Warriors of Sunlight", "Way of White", "Princess Guard", "Way of the Blue", "Heirs of the Sun", "Spears of the Church", "Blades of the Darkmoon", "Watchdogs of Farron"],
  [gameData]);
  
  const EXPERIENCE = useMemo(() => 
    gameData?.experiences?.map(e => e.name) || ["Beginner", "Intermediate", "Expert", "Veteran"],
  [gameData]);

  // Initialize form for admin user creation
  const form = useForm<z.infer<typeof adminUserSchema>>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
      password: "",
      confirm_password: "",
      region: "",
      platform: "",
      covenantName: "",
      experience: "",
      disabled: false,
      autoRegion: true,
      role: "admin",
    },
  });

  // Fetch game data
  useEffect(() => {
    const loadGameData = async () => {
      try {
        const data = await fetchGameData();
        setGameData(data);
      } catch (error) {
        console.error("Error loading game data:", error);
        setNotification({
          type: "warning",
          message: "Could not load region and platform data. Using default values."
        });
      } finally {
        setIsLoadingGameData(false);
      }
    };
    
    loadGameData();
  }, []);

  const loadUsers = async (page = 1, limit = 20, role: string | null = null) => {
    setIsLoading(true);
    try {
      let response;
      
      if (searchQuery.trim()) {
        // If there's a search query, filter the users on the client side
        // This is a simple client-side implementation
        // For a real application, you might want to add search functionality to your API
        response = await UserService.getUsers(page, limit, role);
        
        if (response.status === "success") {
          const filteredUsers = response.data.users.filter(user => 
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
          );
          
          setUsers(filteredUsers);
          
          // Update pagination info for filtered results
          const totalFilteredUsers = filteredUsers.length;
          const totalFilteredPages = Math.ceil(totalFilteredUsers / limit);
          
          setPagination({
            total: totalFilteredUsers,
            page: page > totalFilteredPages ? 1 : page,
            limit,
            total_pages: totalFilteredPages || 1,
          });
        }
      } else {
        // Regular API call without search filtering
        response = await UserService.getUsers(page, limit, role);
        
        if (response.status === "success") {
          setUsers(response.data.users);
          setPagination(response.data.pagination);
        } else {
          throw new Error("Failed to fetch users");
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load users list"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(pagination.page, pagination.limit, currentRole);
  }, [pagination.page, currentRole]);

  const handleSearch = () => {
    // Reset to page 1 when searching
    setPagination(prev => ({ ...prev, page: 1 }));
    loadUsers(1, pagination.limit, currentRole);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.total_pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleRoleFilter = (role: string | null) => {
    setCurrentRole(role);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteUserId) return;
    
    try {
      await UserService.deleteUser(deleteUserId);
      
      setNotification({
        type: "success",
        message: "User deleted successfully"
      });
      
      // Refresh the users list
      loadUsers(pagination.page, pagination.limit, currentRole);
    } catch (error) {
      console.error("Error deleting user:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete user"
      });
    } finally {
      setDeleteUserId(null);
    }
  };

  const onSubmitCreateUser = async (values: z.infer<typeof adminUserSchema>) => {
    setIsSubmitting(true);
    try {
      await UserService.createAdminUser({
        username: values.username,
        email: values.email,
        displayName: values.displayName,
        password: values.password,
        region: values.region,
        platform: values.platform,
        covenantName: values.covenantName,
        experience: values.experience,
        disabled: values.disabled,
        autoRegion: values.autoRegion,
        role: values.role,
      });
      
      setNotification({
        type: "success",
        message: `${values.role === 'admin' ? 'Admin' : 'Regular'} user created successfully`
      });
      form.reset();
      
      // Switch to users tab and refresh the list
      setActiveTab("users-list");
      loadUsers(1, pagination.limit, values.role);
      setCurrentRole(values.role);
    } catch (error) {
      console.error("Error creating user:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create user"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUserList = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-64 flex">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users..."
                className="pl-8 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSearch}
                className="ml-2"
              >
                Search
              </Button>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={currentRole === null ? "default" : "outline"} 
                size="sm"
                onClick={() => handleRoleFilter(null)}
              >
                All
              </Button>
              <Button 
                variant={currentRole === "user" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleRoleFilter("user")}
              >
                Users
              </Button>
              <Button 
                variant={currentRole === "admin" ? "default" : "outline"} 
                size="sm"
                onClick={() => handleRoleFilter("admin")}
              >
                Admins
              </Button>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadUsers(pagination.page, pagination.limit, currentRole)}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {users.length === 0 ? (
          <div className="p-6 border rounded-lg">
            <p className="text-center text-muted-foreground">No users found</p>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{pagination.total}</span> total users | 
                Showing <span className="font-medium">{users.length}</span> users on page <span className="font-medium">{pagination.page}</span>
              </p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.displayName}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-md text-xs ${
                        user.role === "admin" 
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" 
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>{user.region || "-"}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/users/edit/${user.id}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteUserId(user.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.total_pages}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCreateUserForm = () => {
    if (isLoadingGameData) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Create User</CardTitle>
            <CardDescription>Loading form data...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create User</CardTitle>
          <CardDescription>Create a new user account with admin or regular permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreateUser)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username" {...field} />
                      </FormControl>
                      <FormDescription>
                        Username for login (min. 4 characters)
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
                        <Input placeholder="user@example.com" type="email" {...field} />
                      </FormControl>
                      <FormDescription>
                        Email address for the user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Display Name" {...field} />
                      </FormControl>
                      <FormDescription>
                        Public display name for the user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="covenantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Covenant Name</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select covenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COVENANTS.map(covenant => (
                              <SelectItem key={covenant} value={covenant}>{covenant}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        User&apos;s covenant allegiance name
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGIONS.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        User&apos;s geographic region
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLATFORMS.map(platform => (
                            <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        User&apos;s gaming platform
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Minimum 8 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the password again
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="autoRegion"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Auto Region Detection</FormLabel>
                        <FormDescription>
                          Automatically detect and update user&apos;s region
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="disabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Disable Account</FormLabel>
                        <FormDescription>
                          Toggle ON to disable this account
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="user">Regular User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Admin users have full access to the admin panel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select experience" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPERIENCE.map(experience => (
                              <SelectItem key={experience} value={experience}>{experience}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        User&apos;s gaming experience level
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : `Create ${form.getValues().role === 'admin' ? 'Admin' : 'Regular'} User${form.getValues().disabled ? ' (Disabled)' : ''}`}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground mt-2">
          Manage users and create admin accounts
        </p>
      </div>

      {notification && (
        <Notification
          notification={notification}
          onDismiss={() => setNotification(null)}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="users-list" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            <span>Users List</span>
          </TabsTrigger>
          <TabsTrigger value="create-user" className="flex items-center">
            <UserPlus className="h-4 w-4 mr-2" />
            <span>Create User</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users-list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all users on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderUserList()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="create-user" className="mt-6">
          {renderCreateUserForm()}
        </TabsContent>
      </Tabs>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteUserId)} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 