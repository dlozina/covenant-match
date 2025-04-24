import { NewsPreviewClient } from "@/components/admin/NewsPreviewClient";


// According to next.js docs, we should use async functions for dynamic page components
// use client part is added in the NewsPreviewClient component
export default async function NewsPreviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <NewsPreviewClient id={params.id} />;
} 