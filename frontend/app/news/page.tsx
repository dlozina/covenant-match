"use client";

import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewsItem, fetchAllNews } from "@/utils/api";
import { SecureImage } from "@/components/ui/secure-image";

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemsPerPage = 10;

  // Debounce search query changes
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set a new timeout - 500ms debounce
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      // Reset to first page when search changes
      setCurrentPage(1);
    }, 1000); // 1 second debounce

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    const loadNews = async () => {
      setIsLoading(true);
      try {
        const result = await fetchAllNews(currentPage, itemsPerPage, debouncedQuery);
        setNews(result.news);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNews();
  }, [currentPage, debouncedQuery]);

  const formatDate = (dateString: string | { $date: { $numberLong: string } }) => {
    try {
      if (typeof dateString === 'object' && dateString.$date && dateString.$date.$numberLong) {
        const timestamp = parseInt(dateString.$date.$numberLong);
        if (!isNaN(timestamp)) {
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(new Date(timestamp));
        }
      }
      
      // Handle string dates
      const date = new Date(typeof dateString === 'string' ? dateString : Date.now());
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown date";
    }
  };

  // Create a footer to pass to the layout
  const footer = (
    <Footer />
  );

  return (
    <MainLayout footer={footer}>
      <div className="py-4 sm:py-6 md:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 flex items-center">
          <Newspaper className="mr-2" />
          News & Updates
        </h1>

        {/* Search bar */}
        <form className="mb-6 sm:mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card/50 border-purple-900/20 w-full"
            />
          </div>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-12 md:py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-12 md:py-20">
            <p className="text-lg text-muted-foreground">No news articles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {news.map((item) => (
              <Link href={`/news/${item.id}`} key={item.id}>
                <div className="bg-card/50 border border-purple-900/20 rounded-lg overflow-hidden h-full transition-all hover:border-purple-600/50 hover:bg-card/70">
                  {item.image_url ? (
                    <div className="h-40 sm:h-48 overflow-hidden relative">
                      <SecureImage 
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                        fallback={
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-indigo-900/20">
                            <Newspaper className="h-16 w-16 text-purple-500/30" />
                          </div>
                        }
                      />
                    </div>
                  ) : (
                    <div className="h-40 sm:h-48 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 flex items-center justify-center">
                      <Newspaper className="h-16 w-16 text-purple-500/30" />
                    </div>
                  )}
                  <div className="p-3 sm:p-4">
                    <h2 className="text-lg sm:text-xl font-bold mb-2 line-clamp-2">{item.title}</h2>
                    <p className="text-muted-foreground mb-3 sm:mb-4 line-clamp-3">{item.summary}</p>
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center text-purple-400">
                        <Calendar className="mr-1 h-4 w-4" />
                        <span>{item.time_ago || formatDate(item.created_at)}</span>
                      </div>
                      <span className="text-blue-400">Read more</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6 sm:mt-8">
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
    </MainLayout>
  );
} 