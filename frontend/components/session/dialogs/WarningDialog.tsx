import React, { memo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WarningDialog: React.FC<WarningDialogProps> = memo(({ isOpen, onClose }) => (
  <AlertDialog 
    open={isOpen} 
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Session State Warning</AlertDialogTitle>
        <AlertDialogDescription>
          Please note that if you navigate away from this page or refresh the browser, your session state will be lost. 
          It&apos;s recommended to complete your session before leaving this page.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction>I Understand</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)); 