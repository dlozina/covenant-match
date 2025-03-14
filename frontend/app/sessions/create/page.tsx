"use client";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

export default function CreateSessionPage() {
  const [selectedLord, setSelectedLord] = useState<string | null>(null);
  const [selectedFarer, setSelectedFarer] = useState<string | null>(null);
  
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
                Select Nightfarer
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  "Wylder", 
                  "Guardian", 
                  "Recluse", 
                  "Duchess", 
                  "Patces", 
                  "Jolan", 
                  "Igon", 
                  "Alexander"
                ].map(farer => (
                  <Button 
                    key={farer} 
                    variant="outline" 
                    className={`min-h-[4rem] h-auto py-2 px-1 flex flex-col items-center justify-center text-center hover:border-purple-500 hover:bg-purple-950/20 ${
                      selectedFarer === farer ? "border-purple-500 bg-purple-950/20" : ""
                    }`}
                    style={{ whiteSpace: 'normal' }}
                    onClick={() => setSelectedFarer(farer)}
                  >
                    <span className="text-sm w-full overflow-hidden" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{farer}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Night Lord
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  "Tricephalos", 
                  "PCR", 
                  "Malenia, Blade of Miquella", 
                  "Maliketh", 
                  "Mohg", 
                  "Midra", 
                  "Bayle", 
                  "Messmer"
                ].map(lord => (
                  <Button 
                    key={lord} 
                    variant="outline" 
                    className={`min-h-[4rem] h-auto py-2 px-1 flex flex-col items-center justify-center text-center hover:border-purple-500 hover:bg-purple-950/20 ${
                      selectedLord === lord ? "border-purple-500 bg-purple-950/20" : ""
                    }`}
                    style={{ whiteSpace: 'normal' }}
                    onClick={() => setSelectedLord(lord)}
                  >
                    <span className="text-sm w-full overflow-hidden" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{lord}</span>
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