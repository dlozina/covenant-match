import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function CreateSessionPage() {
  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-6 px-4 mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Create New Session</h1>
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
              <label className="text-sm font-medium">
                Select Night Lord
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  "Tricephalos", 
                  "Shang", 
                  "Vandred", 
                  "Zso Sahaal", 
                  "Krieg Acerbus", 
                  "Talos Valcoran", 
                  "Lucoryphus", 
                  "Ruven"
                ].map(lord => (
                  <Button 
                    key={lord} 
                    variant="outline" 
                    className="h-16 flex flex-col items-center justify-center hover:border-purple-500 hover:bg-purple-950/20"
                  >
                    {lord}
                  </Button>
                ))}
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