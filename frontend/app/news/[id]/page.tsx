import { NewsDetailClient } from "@/components/news/NewsDetailClient";

// This is the page component that Next.js will use for routing
export default async function NewsDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <NewsDetailClient id={params.id} />;
} 