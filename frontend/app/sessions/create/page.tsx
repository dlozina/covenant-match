import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function CreateSessionPage() {
  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-10 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Create New Session</h1>
          <Button variant="outline" asChild>
            <Link href="/sessions">Back to Sessions</Link>
          </Button>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="sessionName" className="text-sm font-medium">
                Session Name
              </label>
              <Input 
                id="sessionName" 
                placeholder="Enter a name for your session" 
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="gameType" className="text-sm font-medium">
                Game Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center border-2 border-purple-500 bg-purple-950/30">
                  <span className="text-lg">Standard</span>
                  <span className="text-xs text-muted-foreground">1v1 Match</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                  <span className="text-lg">Tournament</span>
                  <span className="text-xs text-muted-foreground">8 Players</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="playerLimit" className="text-sm font-medium">
                Player Limit
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map(num => (
                  <Button 
                    key={num} 
                    variant="outline" 
                    className={`${num === 3 ? 'border-2 border-purple-500 bg-purple-950/30' : ''}`}
                  >
                    {num} Players
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Additional Options
              </label>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">
                  <span className="mr-2">🔒</span> Private Session
                </Button>
                <Button variant="outline" className="justify-start border-2 border-purple-500 bg-purple-950/30">
                  <span className="mr-2">⏱️</span> Time Limit: 45 min
                </Button>
              </div>
            </div>

            <div className="pt-4">
              <Button className="w-full" size="lg" asChild>
                <Link href="/sessions/run">
                  Create Session
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 