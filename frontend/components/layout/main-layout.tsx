export function MainLayout({ 
  children, 
  leftSidebar, 
  rightSidebar 
}: MainLayoutProps) {
  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {leftSidebar && (
          <aside className="hidden lg:block lg:col-span-3">
            {leftSidebar}
          </aside>
        )}
        <main className={`${leftSidebar || rightSidebar ? 'lg:col-span-6' : 'lg:col-span-12'} col-span-1`}>
          {children}
        </main>
        {rightSidebar && (
          <aside className="hidden lg:block lg:col-span-3">
            {rightSidebar}
          </aside>
        )}
        
        {/* Mobile sidebars (shown at bottom on mobile) */}
        {(leftSidebar || rightSidebar) && (
          <div className="lg:hidden col-span-1 space-y-8">
            {leftSidebar && <div>{leftSidebar}</div>}
            {rightSidebar && <div>{rightSidebar}</div>}
          </div>
        )}
      </div>
    </div>
  );
} 