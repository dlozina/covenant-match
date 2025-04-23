import { EditNewsClient } from "@/components/admin/EditNewsClient";

export default async function EditNewsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <EditNewsClient id={params.id} />;
} 