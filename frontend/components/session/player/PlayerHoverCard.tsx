import React from 'react';
import { UserStats } from '@/utils/api';
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Swords, Trophy, Info } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger
} from "@/components/ui/dialog";

interface PlayerHoverCardProps {
  player: {
    userId: string;
    username: string;
  };
  userStats?: UserStats;
  children: React.ReactNode;
}

export const PlayerHoverCard: React.FC<PlayerHoverCardProps> = ({ 
  userStats, 
  children 
}) => {
  if (!userStats) {
    // If no stats available, just render the children without interactivity
    return <>{children}</>;
  }
  
  return (
    <Dialog>
      <div className="inline-flex items-center">
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        {/* Info icon as a separate trigger */}
        <DialogTrigger asChild>
          <span className="inline-flex items-center ml-1.5 text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer">
            <Info size={14} />
          </span>
        </DialogTrigger>
      </div>
      <DialogContent className="sm:max-w-[425px] p-0">
        <Card className="border-0 shadow-none w-full">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="font-bold text-lg">{userStats.displayName}</h3>
                <p className="text-sm text-muted-foreground">{userStats.covenantName}</p>
              </div>
              <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                {userStats.platform}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-secondary/50 rounded-md p-2 text-center">
                <div className="flex justify-center mb-1">
                  <Trophy size={16} className="text-amber-500" />
                </div>
                <div className="text-sm font-medium">{userStats.totalGames}</div>
                <div className="text-xs text-muted-foreground">Games</div>
              </div>
              
              <div className="bg-secondary/50 rounded-md p-2 text-center">
                <div className="flex justify-center mb-1">
                  <Swords size={16} className="text-green-500" />
                </div>
                <div className="text-sm font-medium">{userStats.wins}</div>
                <div className="text-xs text-muted-foreground">Wins</div>
              </div>
              
              <div className="bg-secondary/50 rounded-md p-2 text-center">
                <div className="flex justify-center mb-1">
                  <Shield size={16} className="text-red-500" />
                </div>
                <div className="text-sm font-medium">{userStats.losses}</div>
                <div className="text-xs text-muted-foreground">Losses</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-1">
              <div className="flex-1">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${userStats.winRate}%` }}
                  />
                </div>
              </div>
              <div className="ml-2 text-sm font-medium">
                {userStats.winRate}% WR
              </div>
            </div>
            
            <div className="text-xs text-center text-muted-foreground pt-1">
              Score: {userStats.score}
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}; 