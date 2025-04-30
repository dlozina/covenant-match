import { AdminBugDetailClient } from "@/components/admin/AdminBugDetailClient";

interface AdminBugDetailPageProps {
  params: {
    id: string;
  };
}

export default function AdminBugDetailPage({ params }: AdminBugDetailPageProps) {
  return <AdminBugDetailClient bugId={params.id} />;
} 