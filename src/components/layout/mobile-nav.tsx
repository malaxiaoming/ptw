'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ALL_NAV_ITEMS } from '@/lib/nav-items'

export function MobileMenuButton() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on navigation (back/forward button)
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1 text-gray-600 hover:text-gray-900"
        aria-label="Open navigation menu"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in nav */}
          <nav
            className="fixed top-0 left-0 bottom-0 w-72 bg-gray-900 text-white z-[60] flex flex-col"
            aria-label="Main navigation"
          >
            <div className="flex justify-between items-center px-4 py-4 border-b border-gray-700">
              <span className="font-bold text-white">PTW System</span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close navigation menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {ALL_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  )
}
