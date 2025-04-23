import { NewsPreviewClient } from "@/components/admin/NewsPreviewClient";

// This is the page component that Next.js will use for routing
export default function NewsPreviewPage({ params }: { params: { id: string } }) {
  return <NewsPreviewClient id={params.id} />;
} 