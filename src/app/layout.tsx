import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Devalok Payroll',
  description: 'Payroll Management System for Devalok',
  icons: {
    icon: 'https://cdn.jsdelivr.net/gh/devalok-design/devalok-brand-assets@main/Favicon/COLOR/PNG/Favicon_COLOR%20(32%20pt).png',
    apple: 'https://cdn.jsdelivr.net/gh/devalok-design/devalok-brand-assets@main/Favicon/COLOR/PNG/Favicon_COLOR%20(180%20pt).png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
