"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, Newspaper, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewsItem, fetchAllNews } from "@/utils/api";

// Custom component for safely displaying images
const SafeImage = ({ src, alt }: { src: string, alt: string }) => {
  // Make sure we use the absolute URL
  const imageSrc = src.startsWith('/uploads/') ? src : src;
  
  return (
    <img
      src={imageSrc}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
};

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    const loadNews = async () => {
      setIsLoading(true);
      try {
        const result = await fetchAllNews(currentPage, itemsPerPage, searchQuery);
        setNews(result.news);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNews();
  }, [currentPage, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
  };

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
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <Newspaper className="mr-2" />
          News & Updates
        </h1>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card/50 border-purple-900/20"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">No news articles found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <Link href={`/news/${item.id}`} key={item.id}>
                <div className="bg-card/50 border border-purple-900/20 rounded-lg overflow-hidden h-full transition-all hover:border-purple-600/50 hover:bg-card/70">
                  {item.image_url ? (
                    <div className="h-48 overflow-hidden relative">
                      <SafeImage 
                        src={item.image_url}
                        alt={item.title}
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-purple-900/20 to-indigo-900/20 flex items-center justify-center">
                      <Newspaper className="h-16 w-16 text-purple-500/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="text-xl font-bold mb-2 line-clamp-2">{item.title}</h2>
                    <p className="text-muted-foreground mb-4 line-clamp-3">{item.summary}</p>
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
          <div className="flex justify-center mt-8">
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