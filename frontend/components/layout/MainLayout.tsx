import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  footer?: React.ReactNode;
}

export function MainLayout({ 
  children, 
  leftSidebar, 
  rightSidebar,
  footer
}: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-col md:flex-row w-full flex-grow">
        {/* Left sidebar - fixed width on desktop */}
        {leftSidebar && (
          <div className="hidden md:block w-64 bg-muted p-4 shrink-0">
            {leftSidebar}
          </div>
        )}

        {/* Main content area - takes remaining space */}
        <div className="flex-grow p-4 md:p-6">
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
      
      {/* Mobile sidebars - shown at the bottom on small screens */}
      <div className="md:hidden px-4 pb-6 space-y-6">
        {leftSidebar && (
          <div className="bg-muted/50 rounded-lg">
            {leftSidebar}
          </div>
        )}
        {rightSidebar && (
          <div className="bg-muted/50 rounded-lg">
            {rightSidebar}
          </div>
        )}
      </div>
      
      {/* Footer - centered and full width */}
      {footer && (
        <div className="w-full mt-auto">
          <div className="max-w-5xl mx-auto">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
} 