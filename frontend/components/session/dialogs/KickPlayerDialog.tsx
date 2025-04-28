import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface KickPlayerDialogProps {
  isOpen: boolean;
  playerName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const KickPlayerDialog = ({
  isOpen,
  playerName,
  onClose,
  onConfirm
}: KickPlayerDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kick Player</DialogTitle>
          <DialogDescription>
            Are you sure you want to kick {playerName} from this session?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Kick Player
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 