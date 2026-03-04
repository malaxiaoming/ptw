export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/permits', label: 'Permits', icon: 'document' },
  { href: '/projects', label: 'Projects', icon: 'folder' },
  { href: '/workers', label: 'Workers', icon: 'users' },
  { href: '/notifications', label: 'Notifications', icon: 'bell' },
  { href: '/settings', label: 'Settings', icon: 'cog' },
] as const

export const ADMIN_NAV_ITEMS = [
  { href: '/users', label: 'Users', icon: 'user-group' },
] as const

export const ALL_NAV_ITEMS = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] as const
