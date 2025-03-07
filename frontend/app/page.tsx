export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-6">Welcome to CovenantMatch</h1>
        <p className="text-xl mb-8">Find teammates, create game sessions, and track your Nightreign statistics.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Find Sessions</h2>
            <p className="mb-4">Join other players looking for teammates and start playing immediately.</p>
            <a href="/sessions" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded">Browse Sessions</a>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Create Session</h2>
            <p className="mb-4">Host a new game session and invite other players to join you.</p>
            <a href="/sessions/create" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded">Create Session</a>
          </div>
        </div>
        
        <div className="bg-muted p-6 rounded-lg mt-8">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <ul className="list-disc pl-6 space-y-2">
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
