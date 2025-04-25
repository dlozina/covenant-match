"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Trash, 
  Search, 
  X, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  CalendarIcon,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types
interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  sessionId: string;
  user?: {
    username?: string;
    displayName?: string;
    email?: string;
    role?: string;
    avatarUrl?: string;
  };
}

interface ChatResponse {
  messages: ChatMessage[];
  total: number;
}

export default function AdminChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [uniqueSessions, setUniqueSessions] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    session?: string;
    messageId?: string;
    dateRange?: {from: string, to: string};
  } | null>(null);
  
  const { getAuthHeaders } = useAuth();

  // Fetch messages when filters or pagination changes
  useEffect(() => {
    fetchMessages();
  }, [sessionFilter, pagination.page, pagination.limit]);

  const formatDateForApi = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    // Format using RFC3339 format which matches what backend expects for DateTime::parse_from_rfc3339
    return date.toISOString();
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const headers = await getAuthHeaders();
      let url = `/api/v1/admin/chat?limit=${pagination.limit}`;
      
      if (sessionFilter) {
        url += `&sessionId=${sessionFilter}`;
      }
      
      if (startDate) {
        const formattedStartDate = formatDateForApi(startOfDay(startDate));
        url += `&fromDate=${formattedStartDate}`;
      }
      
      if (endDate) {
        const formattedEndDate = formatDateForApi(endOfDay(endDate));
        url += `&toDate=${formattedEndDate}`;
      }
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Error fetching chat messages: ${response.status}`);
      }
      
      const data = await response.json() as ChatResponse;
      
      // Check if the response has the expected structure
      if (data && data.messages) {
        setMessages(data.messages);
        setPagination(prev => ({ ...prev, total: data.total || 0 }));
        
        // Extract unique session IDs
        const sessions = [...new Set(data.messages.map(msg => msg.sessionId))];
        setUniqueSessions(sessions);
      } else {
        console.error("Unexpected response format:", data);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error fetching chat messages:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSearch = () => {
    fetchMessages();
  };
  
  const handleSessionFilterChange = (value: string) => {
    setSessionFilter(value === "all" ? "" : value);
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setSessionFilter('');
    setStartDate(undefined);
    setEndDate(undefined);
    fetchMessages();
  };
  
  const handleDeleteMessages = async () => {
    if (!deleteTarget) return;
    
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      let url = '/api/v1/admin/chat';
      const queryParams = [];
      
      if (deleteTarget.session) {
        queryParams.push(`sessionId=${deleteTarget.session}`);
      }
      
      if (deleteTarget.messageId) {
        queryParams.push(`messageId=${deleteTarget.messageId}`);
      }
      
      if (deleteTarget.dateRange) {
        queryParams.push(`fromDate=${deleteTarget.dateRange.from}`);
        queryParams.push(`toDate=${deleteTarget.dateRange.to}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting messages: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Delete result:", result);
      
      // Refresh messages after deletion
      fetchMessages();
      
    } catch (err) {
      console.error("Error deleting messages:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during deletion");
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };
  
  const confirmDeleteSession = (sessionId: string) => {
    setDeleteTarget({ session: sessionId });
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteMessage = (message: ChatMessage) => {
    // Instead of using the composite ID, use the session ID and date range
    // to delete the specific message by timestamp
    const messageTimestamp = new Date(message.timestamp);
    const startTime = new Date(messageTimestamp.getTime() - 1000); // 1 second before
    const endTime = new Date(messageTimestamp.getTime() + 1000);   // 1 second after
    
    setDeleteTarget({ 
      session: message.sessionId,
      dateRange: { 
        from: formatDateForApi(startTime)!, 
        to: formatDateForApi(endTime)! 
      } 
    });
    
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteByDateRange = () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates for deletion");
      return;
    }
    
    setDeleteTarget({ 
      dateRange: { 
        from: formatDateForApi(startOfDay(startDate))!, 
        to: formatDateForApi(endOfDay(endDate))! 
      } 
    });
    setDeleteDialogOpen(true);
  };
  
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Filter messages by search term
  const filteredMessages = messages.filter(msg => 
    msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.senderName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group messages by session for display
  const messagesBySession = filteredMessages.reduce((acc, message) => {
    if (!acc[message.sessionId]) {
      acc[message.sessionId] = [];
    }
    acc[message.sessionId].push(message);
    return acc;
  }, {} as Record<string, ChatMessage[]>);
  
  // Calculate pagination
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Admin Chat Management</h1>
      
      {/* Filters and Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter and search through chat messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Search messages or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            
            <Select value={sessionFilter} onValueChange={handleSessionFilterChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {uniqueSessions.map(session => (
                  <SelectItem key={session} value={session}>
                    Session: {session.substring(0, 8)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1 flex flex-col md:flex-row gap-4">
              <div className="flex flex-col flex-1">
                <span className="text-sm mb-1">Start Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex flex-col flex-1">
                <span className="text-sm mb-1">End Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleSearch} variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Apply Date Filter
                </Button>
              </div>
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleClearFilters} variant="ghost">
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-between">
          <div>
            <span className="text-sm text-muted-foreground">
              Showing {filteredMessages.length} of {pagination.total} messages
            </span>
          </div>
          <div className="flex gap-2">
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteByDateRange}
                  disabled={!startDate || !endDate}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete by Date Range
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteTarget?.session && (
                      <>Are you sure you want to delete all messages in session <b>{deleteTarget.session}</b>?</>
                    )}
                    {deleteTarget?.messageId && (
                      <>Are you sure you want to delete this message?</>
                    )}
                    {deleteTarget?.dateRange && (
                      <>Are you sure you want to delete all messages between <b>{startDate && format(startDate, 'PPP')}</b> and <b>{endDate && format(endDate, 'PPP')}</b>?</>
                    )}
                    <p className="mt-2 text-red-500">This action cannot be undone.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteMessages}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>
      
      {/* Error display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
          <span className="ml-2">Loading messages...</span>
        </div>
      )}
      
      {/* Messages grouped by session */}
      {!isLoading && Object.keys(messagesBySession).length === 0 && (
        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No messages found matching your filters.</p>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && Object.entries(messagesBySession).map(([sessionId, sessionMessages]) => (
        <Card key={sessionId} className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center">
                <span>Session: {sessionId}</span>
                <Badge variant="outline" className="ml-2">
                  {sessionMessages.length} messages
                </Badge>
              </CardTitle>
              <CardDescription>
                Last activity: {format(new Date(sessionMessages[0].timestamp), 'PPpp')}
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => confirmDeleteSession(sessionId)}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Session
                </Button>
              </AlertDialogTrigger>
            </AlertDialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="w-full">Message</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionMessages.map((message) => (
                  <TableRow key={`${message.senderId}-${message.timestamp}`}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              <User className="h-4 w-4 opacity-70" />
                              <span>
                                {message.user?.displayName || message.senderName || "Unknown User"}
                              </span>
                              {message.senderName && message.user?.displayName && message.senderName !== message.user.displayName && (
                                <Badge variant="outline" className="ml-1 text-xs">
                                  {message.senderName}
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold">User Information</p>
                              <p className="text-xs">ID: {message.senderId}</p>
                              <p className="text-xs">Sender Name: {message.senderName}</p>
                              {message.user?.email && (
                                <p className="text-xs">Email: {message.user.email}</p>
                              )}
                              {message.user?.role && (
                                <p className="text-xs">Role: {message.user.role}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="max-w-lg truncate">{message.message}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(message.timestamp), 'PPp')}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => confirmDeleteMessage(message)}
                          >
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {pagination.page} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handlePageChange(Math.min(totalPages, pagination.page + 1))}
            disabled={pagination.page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
} 