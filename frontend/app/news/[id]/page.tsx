import { NewsDetailClient } from "@/components/news/NewsDetailClient";

// This is the page component that Next.js will use for routing
// According to next.js docs, we should use async functions for dynamic page components
// use client part is added in the NewsDetailClient component
export default async function NewsDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <NewsDetailClient id={params.id} />;
} 