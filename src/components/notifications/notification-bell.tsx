'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

interface Notification {
  id: string
  permit_id: string | null
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export function NotificationBell({ align = 'right' }: { align?: 'left' | 'right' }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function fetchNotifications() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.data?.notifications ?? [])
      setUnreadCount(json.data?.unread_count ?? 0)
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function markAllRead() {
    const res = await fetch('/api/notifications/all/read', { method: 'POST' })
    if (!res.ok) return
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  async function markOneRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    if (!res.ok) return
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden ${align === 'left' ? 'left-0 bottom-full mb-2' : 'right-0 mt-2'}`}>
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center">No notifications</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {n.permit_id ? (
                          <Link
                            href={`/permits/${n.permit_id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate"
                            onClick={() => { markOneRead(n.id); setOpen(false) }}
                          >
                            {n.title}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!n.is_read && (
                        <button
                          onClick={() => markOneRead(n.id)}
                          className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"
                          aria-label="Mark as read"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <Link
              href="/notifications"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
