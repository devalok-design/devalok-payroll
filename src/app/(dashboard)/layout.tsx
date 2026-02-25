import { redirect } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/components/layout/SidebarProvider'
import { Footer } from '@/components/layout/Footer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <div className="flex h-screen bg-devalok-50">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {children}
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    </SessionProvider>
  )
}
