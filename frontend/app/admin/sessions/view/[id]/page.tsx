import { AdminSessionViewClient } from "@/components/admin/AdminSessionViewClient";

interface SessionViewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SessionViewPage(props: SessionViewPageProps) {
  const params = await props.params;
  return <AdminSessionViewClient sessionId={params.id} />;
} 