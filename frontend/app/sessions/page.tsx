"use client"

import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { CalendarDays, Clock, GamepadIcon } from "lucide-react";

export default function SessionsPage() {
  // Release date
  const releaseDate = "June 1st, 2025";
  
  return (
    <MainLayout footer={<Footer />}>
      <div className="container py-6 md:py-10 px-4 sm:px-6 md:px-8 mx-auto bg-gradient-to-b from-background to-background/95">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8 p-3 inline-flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
              <GamepadIcon className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-gradient bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-400">
              Majula - Game Sessions Coming Soon!
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-6">
              The ability to create and join sessions will be available on the official release date.
            </p>
            
            <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-10 p-6 border rounded-lg bg-card shadow-md">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Release Date</p>
                  <p className="font-semibold">{releaseDate}</p>
                </div>
              </div>
              
              <div className="h-10 border-l hidden md:block"></div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">Full Features Include</p>
                  <p className="font-semibold">Creating & Joining Sessions</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-6 mb-8">
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium mb-2">What to expect on {releaseDate}:</h3>
                <ul className="text-left space-y-2 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2 text-purple-600">•</span>
                    Create custom game sessions to hunt Night Lords
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-purple-600">•</span>
                    Join public sessions or exclusive friends-only gatherings
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-purple-600">•</span>
                    Filter sessions by experience level and Night Lord preference
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-purple-600">•</span>
                    Share your in-game password with the selected team
                  </li>
                </ul>
              </div>
            </div>
            
            <Button 
              className="bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600"
              size="lg"
              asChild
            >
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
