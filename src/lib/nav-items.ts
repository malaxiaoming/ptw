import { LayoutGrid, FileText, FolderOpen, HardHat, Bell, Settings, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/permits', label: 'Permits', icon: FileText },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/workers', label: 'Workers', icon: HardHat },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/users', label: 'Users', icon: Users },
]

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
