'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { NAV_ITEMS, ALL_NAV_ITEMS } from '@/lib/nav-items'
import { LogoutButton } from './logout-button'

interface MobileMenuButtonProps {
  isAdmin?: boolean
  userName?: string | null
  userEmail?: string | null
  organizationName?: string | null
}

export function MobileMenuButton({ isAdmin = false, userName, userEmail, organizationName }: MobileMenuButtonProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1 text-gray-600 hover:text-gray-900"
        aria-label="Open navigation menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-in nav */}
      <nav
        className={`fixed top-0 left-0 bottom-0 w-72 bg-gray-900 text-white z-[60] flex flex-col transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main navigation"
      >
        <div className="px-4 py-4 border-b border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-white">PTW System</span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white"
              aria-label="Close navigation menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          {(userName || userEmail) && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName ?? userEmail}</p>
              {userName && userEmail && (
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              )}
              {organizationName && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{organizationName}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {(isAdmin ? ALL_NAV_ITEMS : NAV_ITEMS).map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
        <div className="px-3 py-3 border-t border-gray-700">
          <LogoutButton />
        </div>
      </nav>
    </>
  )
}
