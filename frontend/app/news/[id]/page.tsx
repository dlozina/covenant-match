"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { fetchNewsById, NewsItem } from "@/utils/api";
import { Calendar, User, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function NewsDetailPage() {
  const params = useParams();
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert params.id to string, ensuring it's not undefined
  const newsId = Array.isArray(params.id) ? params.id[0] : params.id || '';

  useEffect(() => {
    const fetchNews = async () => {
      // Only fetch if we have a valid news ID
      if (!newsId) {
        setError("News article ID is missing");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await fetchNewsById(newsId);
        setNewsItem(data);
      } catch (err) {
        console.error("Error fetching news:", err);
        setError("Failed to load the news article. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [newsId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Create a footer to pass to the layout
  const footer = (
    <Footer />
  );

  return (
    <MainLayout footer={footer}>
      <div className="container max-w-3xl py-8">
        <Link href="/news">
          <Button variant="ghost" className="mb-6 pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to News
          </Button>
        </Link>

        {isLoading ? (
          <div className="flex flex-col items-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
            <p className="mt-4 text-muted-foreground">Loading article...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20">
            <div className="text-lg text-red-500 font-medium">{error}</div>
            <Link href="/news">
              <Button className="mt-4">View all news</Button>
            </Link>
          </div>
        ) : newsItem ? (
          <article className="bg-card/50 border border-purple-900/20 rounded-lg overflow-hidden backdrop-blur-sm">
            {newsItem.image_url && (
              <div className="w-full h-64 overflow-hidden relative">
                <Image 
                  src={newsItem.image_url} 
                  alt={newsItem.title} 
                  fill
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-6">
              <h1 className="text-3xl font-bold mb-4">{newsItem.title}</h1>
              
              <div className="flex items-center text-sm text-muted-foreground mb-6">
                <div className="flex items-center">
                  <User className="mr-1 h-4 w-4" />
                  <span>{newsItem.author_username}</span>
                </div>
                <div className="mx-2">•</div>
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  <span>{formatDate(newsItem.created_at)}</span>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="text-lg font-medium text-muted-foreground mb-6">
                  {newsItem.summary}
                </div>
                <div dangerouslySetInnerHTML={{ __html: newsItem.content }}></div>
              </div>
            </div>
          </article>
        ) : (
          <div className="flex flex-col items-center py-20">
            <div className="text-lg font-medium">News article not found</div>
            <Link href="/news">
              <Button className="mt-4">View all news</Button>
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 