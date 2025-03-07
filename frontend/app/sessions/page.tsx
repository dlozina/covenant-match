import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SessionsPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Available Sessions</h1>
      <p className="mb-8 text-muted-foreground">Join a session or create your own to start playing with other Nightreign enthusiasts.</p>
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Looking for a session?</h2>
        </div>
        <Button asChild>
          <Link href="/sessions/create">Create Session</Link>
        </Button>
      </div>
      
      <div className="grid gap-4">
        <div className="p-4 border rounded-lg shadow-sm bg-card">
          <p className="text-lg font-medium">No active sessions available.</p>
          <p className="text-muted-foreground">Be the first to create a new session!</p>
        </div>
      </div>
    </div>
  );
}
