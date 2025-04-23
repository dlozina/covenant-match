import { NewsDetailClient } from "@/components/news/NewsDetailClient";

// This is the page component that Next.js will use for routing
export default function NewsDetailPage({ params }: { params: { id: string } }) {
  return <NewsDetailClient id={params.id} />;
} 