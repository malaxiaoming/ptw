import { LayoutGrid, FileText, FolderOpen, Bell, Settings, Users, Building2, Shield } from 'lucide-react'
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
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/users', label: 'Users', icon: Users },
]

export const PLATFORM_NAV_ITEMS: NavItem[] = [
  { href: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { href: '/admin/admins', label: 'Admin Users', icon: Shield },
]

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...ADMIN_NAV_ITEMS, ...PLATFORM_NAV_ITEMS]
