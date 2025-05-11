"use client";

import { useState, useEffect } from "react";
import { LoginAttempt, adminService } from "@/utils/api/admin-service";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Search, X } from "lucide-react";
import { format } from "date-fns";

export default function LoginAttemptsPage() {
  const [loading, setLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [usernameFilter, setUsernameFilter] = useState<string>("");
  const [searchUsername, setSearchUsername] = useState<string>("");

  // Fetch login attempts with current filters and pagination
  const fetchLoginAttempts = async () => {
    try {
      setLoading(true);
      
      // Convert string status filter to boolean or undefined
      let statusBoolean: boolean | undefined = undefined;
      if (statusFilter === "success") statusBoolean = true;
      if (statusFilter === "failed") statusBoolean = false;
      
      const response = await adminService.fetchLoginAttempts(
        currentPage,
        itemsPerPage,
        usernameFilter || undefined,
        statusBoolean
      );
      
      setLoginAttempts(response.data.loginAttempts);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.total);
    } catch (error) {
      console.error("Error fetching login attempts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply username search filter
  const handleSearch = () => {
    setUsernameFilter(searchUsername);
    setCurrentPage(1); // Reset to first page when applying a new filter
  };

  // Clear all filters
  const handleClearFilters = () => {
    setStatusFilter("all");
    setUsernameFilter("");
    setSearchUsername("");
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handle changing items per page
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Format date string to a readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "PPpp"); // Format: "Jan 1, 2021, 12:00 PM"
    } catch {
      return dateString;
    }
  };

  // Fetch login attempts when filters or pagination changes
  useEffect(() => {
    fetchLoginAttempts();
  }, [currentPage, itemsPerPage, statusFilter, usernameFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Login Attempts</h1>
        <p className="text-muted-foreground">
          View and filter all login attempts in the system.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-[260px]">
            <Input
              placeholder="Search by username"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              className="pr-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
            {searchUsername && (
              <button
                className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchUsername("");
                  if (usernameFilter) {
                    setUsernameFilter("");
                  }
                }}
              >
                <X size={16} />
              </button>
            )}
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={handleSearch}
            >
              <Search size={16} />
            </button>
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="success">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {(statusFilter || usernameFilter) && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">per page</span>
        </div>
      </div>

      {/* Login attempts table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-purple-500"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : loginAttempts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No login attempts found.
                </TableCell>
              </TableRow>
            ) : (
              loginAttempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>{attempt.username}</TableCell>
                  <TableCell>{attempt.ipAddress}</TableCell>
                  <TableCell>{formatDate(attempt.createdAt)}</TableCell>
                  <TableCell>
                    {attempt.successful ? (
                      <Badge variant="success" className="flex w-fit items-center gap-1">
                        <CheckCircle size={14} />
                        <span>Success</span>
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex w-fit items-center gap-1">
                        <XCircle size={14} />
                        <span>Failed</span>
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <div className="text-sm text-muted-foreground">
            Showing {loginAttempts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
            {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={i}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 