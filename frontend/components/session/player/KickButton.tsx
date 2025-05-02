import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface KickButtonProps {
  playerId: string;
  onKickPlayer: (playerId: string) => void;
}

export const KickButton = ({ playerId, onKickPlayer }: KickButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full text-red-500 hover:bg-red-100 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onKickPlayer(playerId);
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Kick player</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Kick player from session</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}; 