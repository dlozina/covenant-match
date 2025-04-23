import { NewsPreviewClient } from "@/components/admin/NewsPreviewClient";

// This is the page component that Next.js will use for routing
export default async function NewsPreviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <NewsPreviewClient id={params.id} />;
} 