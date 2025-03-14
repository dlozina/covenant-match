"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { userData } = useAuth();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-6 backdrop-blur-sm">
        <h2 className="text-xl font-semibold mb-4">Welcome, {userData?.displayName || userData?.username || 'Ashen One'}</h2>
        <p className="text-muted-foreground mb-6">
          This is your personal dashboard where you can track your sessions and manage your profile.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-background/50 border border-purple-900/20 rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Recent Sessions</h3>
            <p className="text-sm text-muted-foreground">You haven&apos;t participated in any sessions yet.</p>
          </div>
          
          <div className="bg-background/50 border border-purple-900/20 rounded-lg p-4">
            <h3 className="font-medium text-lg mb-2">Your Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sessions Joined</p>
                <p className="text-2xl font-bold text-purple-400">0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sessions Created</p>
                <p className="text-2xl font-bold text-indigo-400">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 