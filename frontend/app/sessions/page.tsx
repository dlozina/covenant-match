export default function SessionsPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Available Sessions</h1>
      <p className="mb-8">Join a session or create your own to start playing with other Nightreign enthusiasts.</p>
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Looking for a session?</h2>
        </div>
        <a href="/sessions/create" className="px-4 py-2 bg-primary text-primary-foreground rounded">Create Session</a>
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
