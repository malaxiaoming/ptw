import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { getCurrentUser } from '@/lib/auth/get-user'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PTW System',
  description: 'Permit-To-Work Management System',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()

  if (!user) {
    // Unauthenticated: render bare layout (login page)
    return (
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}>
          {children}
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}>
        {/* Mobile header (visible on small screens) */}
        <Header />

        {/* Sidebar (visible on md+ screens) */}
        <Sidebar />

        {/* Main content area */}
        <main className="md:ml-60 min-h-screen">
          {/* Desktop top bar */}
          <div className="hidden md:flex items-center justify-end px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-20">
            <NotificationBell />
          </div>
          {/* Mobile header spacer */}
          <div className="h-14 md:hidden" />
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
