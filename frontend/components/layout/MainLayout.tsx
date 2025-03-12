import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
}

export function MainLayout({ 
  children, 
  leftSidebar, 
  rightSidebar 
}: MainLayoutProps) {
  return (
    <div className="flex flex-col md:flex-row w-full">
      {/* Left sidebar - fixed width on desktop */}
      {leftSidebar && (
        <div className="hidden md:block w-64 bg-muted p-4 shrink-0">
          {leftSidebar}
        </div>
      )}

      {/* Main content area - takes remaining space */}
      <div className="flex-grow p-6">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </div>

      {/* Right sidebar - fixed width on desktop */}
      {rightSidebar && (
        <div className="hidden md:block w-64 bg-muted p-4 shrink-0">
          {rightSidebar}
        </div>
      )}
    </div>
  );
} 