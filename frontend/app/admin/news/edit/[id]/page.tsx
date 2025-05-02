import { EditNewsClient } from "@/components/admin/EditNewsClient";

// According to next.js docs, we should use async functions for dynamic page components
// use client part is added in the EditNewsClient component
export default async function EditNewsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <EditNewsClient id={params.id} />;
} 