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

interface LeaveSessionDialogProps {
  isOpen: boolean;
  isSessionRunning: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LeaveSessionDialog = ({
  isOpen,
  isSessionRunning,
  onClose,
  onConfirm
}: LeaveSessionDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave Session</DialogTitle>
          <DialogDescription>
            {isSessionRunning 
              ? "Are you sure you want to leave this session? The session is currently running."
              : "Are you sure you want to leave this session?"}
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
            Leave Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 