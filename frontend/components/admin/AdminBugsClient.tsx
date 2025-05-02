"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Notification, NotificationType } from "@/components/ui/notification";
import { formatDate, BugReport, BugService, PaginationInfo } from "@/utils/api/bug-service";
import { Bug, Search, Eye, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminBugsClient() {
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
  });
  const router = useRouter();

  const loadBugReports = async (page = pagination.page, limit = pagination.limit, search = searchQuery) => {
    setIsLoading(true);
    try {
      const response = await BugService.getAllBugReports(page, limit, search);
      if (response.status === "success" && response.data.bugs) {
        setBugReports(response.data.bugs);
        setPagination(response.data.pagination);
      } else {
        throw new Error("Failed to load bug reports");
      }
    } catch (error) {
      console.error("Error loading bug reports:", error);
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load bug reports"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBugReports();
  }, []);

  const handleSearch = () => {
    // Reset to page 1 when searching
    loadBugReports(1, pagination.limit, searchQuery);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      loadBugReports(newPage, pagination.limit, searchQuery);
    }
  };

  const handleLimitChange = (value: string) => {
    const newLimit = parseInt(value, 10);
    loadBugReports(1, newLimit, searchQuery);
  };

  const handleViewDetails = (bugId: string) => {
    router.push(`/admin/bugs/${bugId}`);
  };

  const clearNotification = () => {
    setNotification(null);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Bug Reports</h2>
            <p className="text-muted-foreground">
              View and manage bug reports submitted by users
            </p>
          </div>
        </div>

        <div className="border rounded-md p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bug className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Bug Reports</h2>
          </div>
          <p className="text-muted-foreground">
            View and manage bug reports submitted by users
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bug reports..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyPress}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleSearch}
            title="Search"
          >
            Search
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => loadBugReports(pagination.page, pagination.limit)}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {notification && (
        <Notification
          notification={notification}
          onDismiss={clearNotification}
        />
      )}

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle>All Bug Reports</CardTitle>
          <CardDescription>
            {pagination.total} bug reports found
            {searchQuery && ` matching "${searchQuery}"`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {bugReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Bug className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bug reports found</p>
              {searchQuery && (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery("");
                    loadBugReports(1, pagination.limit, "");
                  }}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Reported By</TableHead>
                    <TableHead className="hidden md:table-cell">Device</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bugReports.map((bug) => (
                    <TableRow key={bug.id}>
                      <TableCell className="font-medium">{bug.title}</TableCell>
                      <TableCell className="hidden md:table-cell">{bug.user_name}</TableCell>
                      <TableCell className="hidden md:table-cell">{bug.device}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatDate(bug.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(bug.id)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination Controls */}
              <div className="flex items-center justify-between p-4 border-t">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium">{bugReports.length}</span>{" "}
                    of{" "}
                    <span className="font-medium">{pagination.total}</span>{" "}
                    results
                  </p>
                  <div className="flex items-center ml-4">
                    <p className="text-sm text-muted-foreground mr-2">Rows per page</p>
                    <Select
                      value={pagination.limit.toString()}
                      onValueChange={handleLimitChange}
                    >
                      <SelectTrigger className="h-8 w-16">
                        <SelectValue placeholder={pagination.limit.toString()} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    Page <span className="font-medium">{pagination.page}</span> of{" "}
                    <span className="font-medium">{pagination.total_pages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.total_pages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 