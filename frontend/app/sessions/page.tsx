import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";

export default function SessionsPage() {
  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-6 md:py-10 px-4 sm:px-6 md:px-8 mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-3 md:mb-6">Available Sessions</h1>
        <p className="mb-6 md:mb-8 text-sm md:text-base text-muted-foreground">Join a session or create your own to start playing with other Nightreign enthusiasts.</p>
        
        <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Looking for a session?</h2>
          </div>
          <Button className="w-full sm:w-auto" asChild>
            <Link href="/sessions/create">Create Session</Link>
          </Button>
        </div>
        
        <div className="grid gap-4">
          <div className="p-3 md:p-4 border rounded-lg shadow-sm bg-card">
            <p className="text-base md:text-lg font-medium">No active sessions available.</p>
            <p className="text-sm md:text-base text-muted-foreground">Be the first to create a new session!</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
