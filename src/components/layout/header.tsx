import { getCurrentUser } from '@/lib/auth/get-user'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { MobileMenuButton } from './mobile-nav'

export async function Header() {
  const user = await getCurrentUser()

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-30">
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <span className="font-semibold text-gray-900">PTW System</span>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        {user && (
          <span className="text-sm text-gray-600 hidden sm:block">{user.name ?? user.email}</span>
        )}
      </div>
    </header>
  )
}
