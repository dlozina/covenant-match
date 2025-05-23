"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Trophy } from "lucide-react";
import Link from "next/link";

export default function DonationCancel() {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="space-y-2">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300">
            Donation Cancelled
          </h1>
          <p className="text-muted-foreground text-lg">
            No worries! You can try again whenever you&apos;re ready.
          </p>
        </div>

        <div className="space-y-2">
          <div className="p-6 rounded-lg border border-accent/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <p className="text-muted-foreground text-sm sm:text-base">
              Your support means a lot to me. 
              <br />
              If you have any questions or need assistance,
              <br />
              please don&apos;t hesitate to reach out.
            </p>
            <div className="p-6 rounded-lg border border-accent/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold">What Your Support Enables</h2>
            </div>
            <div>
                <ul className="space-y-2 text-muted-foreground text-sm sm:text-base text-left">
                    <li className="flex items-center gap-2">
                        <span> <span className="text-purple-400">•</span> Cover server costs and ensure reliable performance</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span> <span className="text-purple-400">•</span> Maintain and improve the platform&apos;s features</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span> <span className="text-purple-400">•</span> Fund new features and updates to enhance your matchmaking experience</span>
                    </li>
                </ul>
            </div>
          </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              className="hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50"
              asChild
            >
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
              asChild
            >
              <Link href="/donations" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Try Again
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
