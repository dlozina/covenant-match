import { AdminBugDetailClient } from "@/components/admin/AdminBugDetailClient";

interface AdminBugDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminBugDetailPage(props: AdminBugDetailPageProps) {
  const params = await props.params;
  return <AdminBugDetailClient bugId={params.id} />;
} 