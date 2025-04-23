"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  PlusCircle, 
  Search, 
  Edit, 
  Trash, 
  Eye, 
  EyeOff,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { NewsItem } from "@/utils/api";

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Mock API call - replace with actual API call when ready
    const fetchNews = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockNews: NewsItem[] = [
        {
          id: "1",
          title: "New Character Added to Nightreign",
          summary: "The Dark Knight is now available in Nightreign with unique abilities.",
          content: "<p>The Dark Knight brings a new style of gameplay...</p>",
          author_username: "NightReignDev",
          published: true,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          time_ago: "2 days ago"
        },
        {
          id: "2",
          title: "Matchmaking Improved",
          summary: "Session joining is now faster than ever with our latest update.",
          content: "<p>We've completely rewritten our matchmaking algorithm...</p>",
          author_username: "CovenantTeam",
          published: true,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          time_ago: "5 days ago"
        },
        {
          id: "3",
          title: "Weekly Community Tournament Results",
          summary: "Check out the results from last weekend's community tournament.",
          content: "<p>Congratulations to our winners and thank you to everyone...</p>",
          author_username: "TournamentAdmin",
          published: true,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          time_ago: "7 days ago"
        },
        {
          id: "4",
          title: "Upcoming Maintenance [DRAFT]",
          summary: "Server maintenance scheduled for next week.",
          content: "<p>We will be performing server maintenance next Tuesday...</p>",
          author_username: "SystemAdmin",
          published: false,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          time_ago: "1 day ago"
        }
      ];
      
      // Filter by status if needed
      const filteredNews = statusFilter === "all" 
        ? mockNews 
        : mockNews.filter(item => 
            statusFilter === "published" ? item.published : !item.published
          );
      
      // Filter by search query if needed
      const searchedNews = searchQuery 
        ? filteredNews.filter(item => 
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.summary.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : filteredNews;
      
      setNews(searchedNews);
      setTotalPages(Math.ceil(searchedNews.length / 10)); // Assuming 10 items per page
      setIsLoading(false);
    };
    
    fetchNews();
  }, [searchQuery, statusFilter, currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled in useEffect
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when changing filters
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">News Management</h1>
        <Link href="/admin/news/create">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create News
          </Button>
        </Link>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearch} className="w-full sm:w-auto">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                <Button type="submit">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-1">Status:</span>
              <Select
                value={statusFilter}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">No news articles found</p>
        </div>
      ) : (
        <div className="bg-card rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Author</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {news.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id.substring(0, 5)}...</TableCell>
                  <TableCell className="font-medium">
                    <div className="max-w-sm">
                      <div className="truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.summary}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{item.author_username}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(item.created_at)}</TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      item.published 
                        ? "bg-green-500/10 text-green-500" 
                        : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {item.published ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Published
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Draft
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/news/edit/${item.id}`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/news/${item.id}`} target="_blank">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="text-red-500">
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
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
} 