import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MainLayout } from "@/components/layout";
import { Sword, Shield, Timer, Users, Trophy, Skull, ScrollText, Compass } from "lucide-react";
// Use for test if css config is not working
// import { TestStyled } from "@/components/ui/test-styled";
// import { BasicTest } from "@/components/ui/basic-test";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  // Add custom sidebars with improved styling
  const leftSidebar = (
    <div className="h-full space-y-6 py-4">
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 backdrop-blur-sm">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span>Top Players</span>
        </h3>
        <div className="space-y-3">
          {["Ashen One", "Tarnished", "Hunter"].map((name, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 h-6 w-6 flex items-center justify-center text-xs">
                  {i+1}
                </div>
                <span>{name}</span>
              </div>
              <span className="text-indigo-400">{120 - (i * 15)} W</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 backdrop-blur-sm">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
          <Timer className="h-5 w-5 text-emerald-400" />
          <span>Active Sessions</span>
        </h3>
        <div className="text-4xl font-bold text-center py-2 text-emerald-400">
          24
        </div>
        <div className="text-xs text-center text-muted-foreground">
          Players looking for groups now
        </div>
      </div>
    </div>
  );
  
  const rightSidebar = (
    <div className="h-full space-y-6 py-4">
      <div className="bg-card/50 border border-purple-900/20 rounded-lg p-4 backdrop-blur-sm">
        <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
          <ScrollText className="h-5 w-5 text-blue-400" />
          <span>News & Updates</span>
        </h3>
        <div className="space-y-4">
          <div className="border-b border-purple-900/20 pb-3">
            <h4 className="font-medium">New Character Added</h4>
            <p className="text-sm text-muted-foreground">The Dark Knight is now available in Nightreign.</p>
            <p className="text-xs text-purple-400 mt-1">2 days ago</p>
          </div>
          <div className="border-b border-purple-900/20 pb-3">
            <h4 className="font-medium">Matchmaking Improved</h4>
            <p className="text-sm text-muted-foreground">Session joining is now faster than ever.</p>
            <p className="text-xs text-purple-400 mt-1">5 days ago</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Create a footer to pass to the layout
  const footer = (
    <Footer />
  );

  return (
    <MainLayout 
      leftSidebar={leftSidebar} 
      rightSidebar={rightSidebar}
      footer={footer}
    >
      {/* Hero Section */}
      <div className="relative rounded-lg overflow-hidden mb-8 md:mb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 to-indigo-900/80 z-10"></div>
        <div className="absolute inset-0 bg-[url('/nightreign-bg.jpeg')] bg-cover bg-center opacity-100"></div>
        <div className="relative z-20 px-4 py-12 md:px-6 md:py-24 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-200">
            Welcome to Covenant Match
          </h1>
          <p className="text-lg md:text-xl mb-6 md:mb-8 text-slate-300">
            Find worthy allies, forge unbreakable covenants, and rise through the ranks in Nightreign.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
              <Link href="/create-profile" className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Join Now
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-purple-500 text-purple-300 hover:bg-purple-950/50">
              <Link href="/sessions" className="flex items-center">
                <Compass className="mr-2 h-5 w-5" />
                Explore Sessions
              </Link>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 my-8 md:my-12">
        <div className="group bg-gradient-to-br from-background to-purple-950/10 rounded-lg p-4 md:p-6 border border-purple-900/20 shadow-md hover:shadow-purple-900/5 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-start gap-3 md:gap-4">
            <div className="bg-purple-900/30 p-2 md:p-3 rounded-lg">
              <Sword className="h-5 w-5 md:h-6 md:w-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-semibold mb-2">Find Sessions</h2>
              <p className="mb-4 text-sm md:text-base text-muted-foreground">Join other Ashen Ones looking for allies and begin your hunt immediately.</p>
              <Button asChild variant="outline" className="border-purple-700/50 hover:bg-purple-950/50 hover:text-purple-300">
                <Link href="/sessions" className="flex items-center">
                  Browse Sessions
                  <Shield className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
        
        <div className="group bg-gradient-to-br from-background to-indigo-950/10 rounded-lg p-4 md:p-6 border border-indigo-900/20 shadow-md hover:shadow-indigo-900/5 transition-all relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-start gap-3 md:gap-4">
            <div className="bg-indigo-900/30 p-2 md:p-3 rounded-lg">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-semibold mb-2">Create Session</h2>
              <p className="mb-4 text-sm md:text-base text-muted-foreground">Host a new covenant and summon fellow hunters to join your quest.</p>
              <Button asChild variant="outline" className="border-indigo-700/50 hover:bg-indigo-950/50 hover:text-indigo-300">
                <Link href="/sessions/create" className="flex items-center">
                  Create Session
                  <Skull className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="bg-card/30 border border-accent/20 p-4 md:p-6 rounded-lg mt-6 md:mt-8 backdrop-blur-sm">
        <h2 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 pb-2 border-b border-purple-900/20">The Dark Covenant Awaits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="flex items-start gap-3">
            <div className="bg-purple-900/30 p-2 rounded-lg">
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium">Matchmaking</h3>
              <p className="text-sm text-muted-foreground">Find the perfect allies for your Nightreign journey.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-indigo-900/30 p-2 rounded-lg">
              <Sword className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-medium">Secure Sessions</h3>
              <p className="text-sm text-muted-foreground">Password protection ensures only the worthy may join.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-900/30 p-2 rounded-lg">
              <Trophy className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium">Track Statistics</h3>
              <p className="text-sm text-muted-foreground">Record your victories and analyze your performance.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-emerald-900/30 p-2 rounded-lg">
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-medium">Build Reputation</h3>
              <p className="text-sm text-muted-foreground">Earn respect through honorable conduct and fair play.</p>
            </div>
          </div>
        </div>
      </div>
      {/* Test the styles if their are not working
      <TestStyled />
      <BasicTest /> */}
    </MainLayout>
  );
}
