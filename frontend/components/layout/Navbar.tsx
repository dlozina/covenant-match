import Link from 'next/link'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu } from "lucide-react"

export function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
        <Link href="/" className="font-bold text-xl mr-6">
          CovenantMatch
        </Link>
        
        <div className="hidden md:flex space-x-4 flex-1">
          <Link href="/sessions" className="text-muted-foreground hover:text-foreground">
            Browse Sessions
          </Link>
          <Link href="/sessions/create" className="text-muted-foreground hover:text-foreground">
            Create Session
          </Link>
        </div>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/sessions">Browse Sessions</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/sessions/create">Create Session</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
} 