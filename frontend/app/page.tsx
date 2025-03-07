import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-6">Welcome to CovenantMatch</h1>
        <p className="text-xl mb-8 text-muted-foreground">Find teammates, create game sessions, and track your Nightreign statistics.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">Find Sessions</h2>
            <p className="mb-4 text-muted-foreground">Join other players looking for teammates and start playing immediately.</p>
            <Button asChild>
              <Link href="/sessions">Browse Sessions</Link>
            </Button>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">Create Session</h2>
            <p className="mb-4 text-muted-foreground">Host a new game session and invite other players to join you.</p>
            <Button asChild>
              <Link href="/sessions/create">Create Session</Link>
            </Button>
          </div>
        </div>
        
        <div className="bg-muted p-6 rounded-lg mt-8">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Matchmaking with other Nightreign players</li>
            <li>Secure password sharing for game sessions</li>
            <li>Track your game statistics and achievements</li>
            <li>Build your reputation through fair play and accurate reporting</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
