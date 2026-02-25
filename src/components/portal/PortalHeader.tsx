'use client'

import { useSession } from 'next-auth/react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useSidebar } from '@/components/layout/SidebarProvider'

interface PortalHeaderProps {
  title?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function PortalHeader({ title }: PortalHeaderProps) {
  const { data: session } = useSession()
  const { toggle } = useSidebar()

  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between">
      {/* Left side — hamburger + title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="md:hidden text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
        </Button>
        {title && (
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {getInitials(session?.user?.name || 'U')}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {session?.user?.name || 'User'}
          </p>
          <p className="text-xs text-muted-foreground">Team Member</p>
        </div>
      </div>
    </header>
  )
}
