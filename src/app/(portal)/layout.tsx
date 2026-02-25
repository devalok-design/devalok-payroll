import { redirect } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { PortalSidebar } from '@/components/portal/PortalSidebar'
import { SidebarProvider } from '@/components/layout/SidebarProvider'
import { Footer } from '@/components/layout/Footer'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // Only LOKWASI role can access the portal
  if (session.user.role !== 'LOKWASI') {
    redirect('/')
  }

  return (
    <SessionProvider session={session}>
      <SidebarProvider>
        <div className="flex h-screen bg-devalok-50">
          <PortalSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            {children}
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    </SessionProvider>
  )
}
