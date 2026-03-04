import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/get-user'
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '@/lib/nav-items'
import { NotificationBell } from '@/components/notifications/notification-bell'

// Sidebar is used on protected pages only (login page uses its own layout)
// Since it's a server component we can read the user directly

export async function Sidebar() {
  const user = await getCurrentUser()

  // Determine if user is admin in any project
  // For simplicity in v1: show admin items if user has 'admin' role somewhere
  // We can't know without a project context, so show all nav items
  // (access control is enforced at the page/API level)

  return (
    <aside
      className="hidden md:flex flex-col w-60 min-h-screen bg-gray-900 text-white fixed left-0 top-0 bottom-0 z-40"
      aria-label="Sidebar"
    >
      {/* Logo/Brand */}
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">PTW System</h1>
        <p className="text-xs text-gray-400 mt-0.5">Permit-To-Work</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
        ))}

        {/* Admin section — show always, access controlled at route level */}
        <div className="pt-4 mt-4 border-t border-gray-700">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Admin</p>
          {ADMIN_NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </div>
      </nav>

      {/* User info + notification bell at bottom */}
      {user && (
        <div className="px-4 py-3 border-t border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name ?? user.email}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <NotificationBell />
          </div>
        </div>
      )}
    </aside>
  )
}

// Simple nav link — uses active state detection via pathname
// Since this is a server component we can't use usePathname, so we render plain links
function SidebarLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      <NavIcon name={icon} />
      {label}
    </Link>
  )
}

function NavIcon({ name }: { name: string }) {
  const cls = 'h-5 w-5 flex-shrink-0'
  switch (name) {
    case 'grid':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    case 'document':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    case 'folder':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
    case 'users':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    case 'bell':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
    case 'user-group':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    case 'cog':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    default:
      return <span className={cls} />
  }
}
