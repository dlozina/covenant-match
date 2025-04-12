"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">404</h1>
        <p className="text-xl text-purple-200 mb-6">Page Not Found</p>
        <p className="text-sm text-purple-300 mb-8">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
} 