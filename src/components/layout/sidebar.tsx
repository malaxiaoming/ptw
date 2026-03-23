import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/get-user'
import { NAV_ITEMS, ADMIN_NAV_ITEMS, PLATFORM_NAV_ITEMS, type NavItem } from '@/lib/nav-items'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { LogoutButton } from './logout-button'

export async function Sidebar() {
  const user = await getCurrentUser()

  return (
    <aside
      className="hidden md:flex flex-col w-60 min-h-screen bg-gray-900 text-white fixed left-0 top-0 bottom-0 z-40"
      aria-label="Sidebar"
    >
      {/* Logo/Brand */}
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">PTW System</h1>
        <p className="text-xs text-gray-400 mt-0.5">{user?.organization_name ?? 'Permit-To-Work'}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} />
        ))}

        {/* Admin section */}
        {user?.is_admin && (
          <div className="pt-4 mt-4 border-t border-gray-700">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin</p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </div>
        )}

        {/* Platform section */}
        {user?.system_role && (
          <div className="pt-4 mt-4 border-t border-gray-700">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Platform</p>
            {PLATFORM_NAV_ITEMS.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}
          </div>
        )}
      </nav>

      {/* User info + notification bell at bottom */}
      {user && (
        <div className="px-4 py-3 border-t border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name ?? user.email}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <NotificationBell align="left" />
          </div>
          <LogoutButton className="flex items-center gap-3 px-0 py-2 mt-2 text-sm text-gray-400 hover:text-white transition-colors w-full" />
        </div>
      )}
    </aside>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {item.label}
    </Link>
  )
}
