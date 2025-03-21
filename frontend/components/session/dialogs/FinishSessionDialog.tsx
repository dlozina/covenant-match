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

interface FinishSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const FinishSessionDialog: React.FC<FinishSessionDialogProps> = memo(({ 
  isOpen, 
  onClose, 
  onConfirm 
}) => (
  <AlertDialog 
    open={isOpen} 
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Finish Session</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to finish this session? You will be asked to report your results.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>
          Yes, Finish Session
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)); 