import React, { memo } from 'react';
import { Button } from "@/components/ui/button";

interface ResultButtonProps {
  type: string;
  isSelected: boolean;
  onSelect: () => void;
}

const ResultButtonComponent = ({ type, isSelected, onSelect }: ResultButtonProps) => {
  const label = type === 'dc' ? 'D/C' : type.toUpperCase();
  const title = type === 'dc' ? 'Disconnect' : type;
  
  return (
    <Button 
      variant="outline" 
      className={`h-20 lg:h-24 ${
        isSelected 
          ? 'bg-emerald-950 text-emerald-500 border-emerald-500 border-2' 
          : 'bg-secondary/50 text-foreground'
      } flex flex-col`}
      onClick={onSelect}
      title={title}
    >
      <span>{label}</span>
      {isSelected && (
        <span className="text-xs text-muted-foreground">Selected</span>
      )}
    </Button>
  );
};

ResultButtonComponent.displayName = 'ResultButton';

export const ResultButton = memo(ResultButtonComponent); 