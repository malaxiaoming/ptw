'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ProjectSubNavProps {
  projectId: string
  projectName: string
  isAdmin: boolean
}

export default function ProjectSubNav({ projectId, projectName, isAdmin }: ProjectSubNavProps) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  const tabs = [
    { label: 'Overview', href: base, adminOnly: false },
    { label: 'Team', href: `${base}/team`, adminOnly: true },
    { label: 'Companies', href: `${base}/companies`, adminOnly: true },
    { label: 'Workers', href: `${base}/workers`, adminOnly: true },
    { label: 'Settings', href: `${base}/settings`, adminOnly: true },
  ]

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin)

  return (
    <nav className="border-b border-gray-200 mb-6">
      <div className="flex gap-6">
        {visibleTabs.map((tab) => {
          const isActive =
            tab.href === base
              ? pathname === base
              : pathname.startsWith(tab.href)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
