import React from "react";

export function Footer() {
  return (
    <footer className="py-6 md:px-8 md:py-0">
      <div className="container flex flex-col items-center justify-center gap-4 md:h-16 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground">
          &copy; {new Date().getFullYear()} CovenantMatch. All rights reserved. 
          <br />
          Made with ❤️ for Elden Ring. <a href="/donations" className="text-purple-500 hover:text-purple-600">Donate</a>.
        </p>
      </div>
    </footer>
  );
} 