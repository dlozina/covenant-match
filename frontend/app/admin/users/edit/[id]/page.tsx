import { EditUserClient } from "@/components/admin/EditUserClient";

interface UserDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailsPage(props: UserDetailsPageProps) {
  const params = await props.params;
  return <EditUserClient userId={params.id} />;
} 