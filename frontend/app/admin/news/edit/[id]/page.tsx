import { EditNewsClient } from "@/components/admin/EditNewsClient";

export default function EditNewsPage({ params }: { params: { id: string } }) {
  return <EditNewsClient id={params.id} />;
} 