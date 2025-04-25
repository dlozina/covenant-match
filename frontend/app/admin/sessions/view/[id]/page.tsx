import { AdminSessionViewClient } from "@/components/admin/AdminSessionViewClient";

interface SessionViewPageProps {
  params: {
    id: string;
  };
}

export default function SessionViewPage({ params }: SessionViewPageProps) {
  return <AdminSessionViewClient sessionId={params.id} />;
} 