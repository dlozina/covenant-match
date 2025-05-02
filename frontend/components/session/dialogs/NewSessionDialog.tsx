import React, { memo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NewSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const NewSessionDialogComponent = ({ 
  isOpen, 
  onClose, 
  onConfirm 
}: NewSessionDialogProps) => (
  <AlertDialog 
    open={isOpen} 
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>New Session Available</AlertDialogTitle>
        <AlertDialogDescription>
          The host has created a new session. Would you like to join it now?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Not Now</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>
          Yes, Join Session
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

NewSessionDialogComponent.displayName = 'NewSessionDialog';

export const NewSessionDialog = memo(NewSessionDialogComponent); 