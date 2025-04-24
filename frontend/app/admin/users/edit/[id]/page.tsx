import { EditUserClient } from "@/components/admin/EditUserClient";

interface EditUserPageProps {
  params: {
    id: string;
  };
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  return <EditUserClient userId={params.id} />;
} 