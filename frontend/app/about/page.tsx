"use client";

import { MainLayout } from "@/components/layout";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { GamepadIcon, Sword, Shield, Users, Skull, Mail } from "lucide-react";

export default function AboutPage() {
  return (
    <MainLayout footer={<Footer />}>
      <div className="space-y-8">
        {/* Title Section */}
        <div className="flex flex-col items-center text-center space-y-4 mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-3xl md:text-3xl font-bold mb-2 text-gradient bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
              About Covenant Match
            </span>
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full glow-sm"></div>
        </div>

        {/* Creator Profile Card */}
        <Card className="gothic-card-no-hover overflow-hidden">
          <div className="relative h-56 md:h-64 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 to-background z-10"></div>
            <div className="absolute inset-0 bg-[url('/nightreign-bg.webp')] bg-cover bg-center opacity-40"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 glow-sm flex items-center justify-center">
                  <GamepadIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white text-shadow-sm">Covenant Match</h2>
                  <p className="text-purple-200">Matchmaking for Nightreign</p>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="p-6 prose prose-invert max-w-none">
            <p className="text-lg leading-relaxed mb-6 relative">
              Hi there, I&apos;m Akri — a Souls games lover and an engineer by trade. When I&apos;m not building cool stuff, 
              you&apos;ll probably find me playing Elden Ring, Sekiro, Bloodborne, or any other Souls game 
              I can get my hands on — yes, DS2 included.
            </p>
            
            <p className="text-lg leading-relaxed mb-6">
              After the network test for Elden Ring: Nightreign, I was way too hyped. But while waiting for the full release, 
              I decided to channel that energy into building something new: Covenant Match. Think of it as my love letter to both 
              my favorite game and the art of engineering.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <div className="flex flex-col items-center p-4 bg-card/50 border border-purple-900/20 rounded-lg backdrop-blur-sm">
                <Sword className="h-8 w-8 text-purple-400 mb-2" />
                <h3 className="font-bold text-lg mb-1">For Veterans</h3>
                <p className="text-center text-sm text-muted-foreground">Form solid teams for punishing runs</p>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-card/50 border border-purple-900/20 rounded-lg backdrop-blur-sm">
                <Shield className="h-8 w-8 text-indigo-400 mb-2" />
                <h3 className="font-bold text-lg mb-1">For Newcomers</h3>
                <p className="text-center text-sm text-muted-foreground">Link up and learn the ropes together</p>
              </div>
              
              <div className="flex flex-col items-center p-4 bg-card/50 border border-purple-900/20 rounded-lg backdrop-blur-sm">
                <Users className="h-8 w-8 text-blue-400 mb-2" />
                <h3 className="font-bold text-lg mb-1">For Everyone</h3>
                <p className="text-center text-sm text-muted-foreground">Because everyone deserves a good squad</p>
              </div>
            </div>

            <p className="text-lg leading-relaxed mb-6">
              I&apos;ve created Covenant Match as the ultimate hub where veteran Souls players can form solid teams and tackle 
              even the most punishing runs. But it&apos;s also for newcomers who want to link up and get up to speed with the world of Elden Ring. Everyone deserves a good squad, right?
            </p>
            
            <p className="text-lg leading-relaxed relative">
              <span className="text-purple-400 font-semibold">Fun fact:</span> None of my friends play Souls games. Not a single one. 
              So, I guess you could say Covenant Match was a necessity. And hey, it kept me motivated to finish the project. 
              Sometimes you gotta create what you need, right?
              
              <Skull className="absolute -right-2 -bottom-2 h-16 w-16 text-muted-foreground/10 rotate-12" />
              <br />
              I hope you enjoy using Covenant Match as much as I enjoyed building it.
            </p>
            <br />
            <p className="text-lg leading-relaxed relative">
            Get in touch with me: 
            <br />
            <span className="group inline-flex items-center gap-1 pl-1 text-purple-400 border-b border-purple-500/30">
                <Mail className="h-4 w-4" />
                <a href="mailto:akri@covenant-match.com" className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300">
                  akri@covenant-match.com
                </a>
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 