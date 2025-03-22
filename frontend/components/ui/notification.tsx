"use client"

import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export type NotificationType = {
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface NotificationProps {
  notification: NotificationType | null;
  className?: string;
  onDismiss?: () => void;
}

const Notification = ({ 
  notification, 
  className, 
  onDismiss 
}: NotificationProps) => {
  if (!notification) return null;

  const { type, message } = notification;

  // Determine background, border and text colors based on notification type
  const colorStyles = {
    error: "bg-red-100 text-red-700 border-red-300",
    warning: "bg-amber-100 text-amber-700 border-amber-300",
    success: "bg-green-100 text-green-700 border-green-300",
  };

  // Select appropriate icon based on notification type
  const Icon = type === 'error' 
    ? AlertCircle 
    : type === 'warning' 
      ? AlertTriangle 
      : CheckCircle;

  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-md border text-sm",
      colorStyles[type],
      className
    )}>
      <Icon size={16} className="flex-shrink-0" />
      <span>{message}</span>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="ml-auto p-1 rounded-full hover:bg-opacity-20 hover:bg-current"
          aria-label="Dismiss notification"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </div>
  );
};

export { Notification }; 