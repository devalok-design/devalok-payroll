'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Wallet,
  User,
  LogOut,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSidebar } from '@/components/layout/SidebarProvider'

const navigation = [
  { name: 'Overview', href: '/portal', icon: LayoutDashboard },
  { name: 'Payslips', href: '/portal/payslips', icon: FileText },
  { name: 'TDS', href: '/portal/tds', icon: Receipt },
  { name: 'Account', href: '/portal/account', icon: Wallet },
  { name: 'Profile', href: '/portal/profile', icon: User },
]

function SidebarContent() {
  const pathname = usePathname()
  const { close } = useSidebar()

  return (
    <div className="flex flex-col h-full w-64 bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="p-6">
        <Image
          src="/brand/logo-white.png"
          alt="Devalok"
          width={140}
          height={42}
          priority
        />
        <p className="mt-2 text-[10px] font-medium tracking-widest uppercase text-sidebar-foreground/60">
          Karm Portal
        </p>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/portal' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={close}
              className={cn(
                'flex items-center gap-3 py-2.5 text-sm font-medium rounded-sm transition-colors',
                isActive
                  ? 'border-l-[3px] border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground pl-[9px] pr-3'
                  : 'px-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User section */}
      <div className="p-3">
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

export function PortalSidebar() {
  const { isOpen, close } = useSidebar()

  return (
    <>
      {/* Desktop sidebar — static */}
      <div className="hidden md:block shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar — overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={close}
          />
          {/* Drawer */}
          <div className="relative h-full w-64 animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
