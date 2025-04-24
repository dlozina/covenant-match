import { EditUserClient } from "@/components/admin/EditUserClient";

interface UserDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function UserDetailsPage({ params }: UserDetailsPageProps) {
  return <EditUserClient userId={params.id} />;
} 