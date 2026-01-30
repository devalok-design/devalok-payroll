'use client'

import { useSession } from 'next-auth/react'
import { Bell, User } from 'lucide-react'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="h-16 bg-white border-b border-[var(--border)] px-6 flex items-center justify-between">
      {/* Page Title */}
      <div>
        {title && (
          <h1 className="text-lg font-semibold text-[var(--foreground)]">{title}</h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* User */}
        <div className="flex items-center gap-3 pl-4 border-l border-[var(--border)]">
          <div className="w-8 h-8 bg-[var(--primary)] flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-[var(--foreground)]">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {session?.user?.role || 'Admin'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
