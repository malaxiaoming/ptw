'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import ProjectSubNav from '@/components/projects/project-sub-nav'

interface Project {
  id: string
  name: string
}

interface Company {
  id: string
  name: string
  role: string
  is_active: boolean
}

const COMPANY_ROLES = ['main_contractor', 'subcontractor'] as const
type CompanyRole = typeof COMPANY_ROLES[number]

const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  main_contractor: 'Main Contractor',
  subcontractor: 'Subcontractor',
}

export default function ProjectCompaniesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [project, setProject] = useState<Project | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [addCompanyName, setAddCompanyName] = useState('')
  const [addCompanyRole, setAddCompanyRole] = useState<CompanyRole>('subcontractor')
  const [addingCompany, setAddingCompany] = useState(false)
  const [addCompanyError, setAddCompanyError] = useState<string | null>(null)
  const [removingCompanyId, setRemovingCompanyId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setFetchError(null)
      try {
        const [projectRes, companiesRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/companies`),
        ])
        const projectJson = await projectRes.json()
        const companiesJson = await companiesRes.json()

        if (!projectRes.ok) {
          setFetchError(projectJson.error ?? 'Failed to load project')
          return
        }
        if (!companiesRes.ok) {
          setFetchError('Access denied')
          return
        }

        setProject(projectJson.data)
        setCompanies(companiesJson.data ?? [])
      } catch {
        setFetchError('Failed to load companies')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault()
    if (!addCompanyName.trim()) return
    setAddingCompany(true)
    setAddCompanyError(null)
    try {
      const res = await fetch(`/api/projects/${id}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addCompanyName.trim(), role: addCompanyRole }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddCompanyError(json.error ?? 'Failed to add company')
      } else {
        setCompanies((prev) => [...prev, json.data])
        setAddCompanyName('')
        setAddCompanyRole('subcontractor')
      }
    } catch {
      setAddCompanyError('Failed to add company')
    } finally {
      setAddingCompany(false)
    }
  }

  async function handleRemoveCompany(companyId: string) {
    setRemovingCompanyId(companyId)
    try {
      const res = await fetch(`/api/projects/${id}/companies`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: companyId }),
      })
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== companyId))
      } else {
        const json = await res.json().catch(() => ({}))
        setAddCompanyError(json.error ?? 'Failed to remove company')
      }
    } catch {
      setAddCompanyError('Failed to remove company')
    } finally {
      setRemovingCompanyId(null)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading companies...</div>
  }

  if (fetchError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{fetchError}</p>
        <Link href="/projects" className="text-sm text-blue-600 hover:underline mt-2 block">
          Back to Projects
        </Link>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Projects
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{project.name}</h1>
      </div>

      <ProjectSubNav projectId={id} projectName={project.name} isAdmin={true} />

      <div className="bg-white border border-gray-200 rounded-lg max-w-2xl">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Registered Companies</h2>
        </div>

        {/* Add company form */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add Company</h3>
          {addCompanyError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{addCompanyError}</p>
            </div>
          )}
          <form onSubmit={handleAddCompany} className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Company name"
              value={addCompanyName}
              onChange={(e) => setAddCompanyName(e.target.value)}
              className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={addCompanyRole}
              onChange={(e) => setAddCompanyRole(e.target.value as CompanyRole)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {COMPANY_ROLES.map((r) => (
                <option key={r} value={r}>{COMPANY_ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={addingCompany || !addCompanyName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingCompany ? 'Adding...' : 'Add'}
            </button>
          </form>
        </div>

        {/* Companies list */}
        {companies.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-500 text-sm">
            No companies registered yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {companies.map((company) => (
              <li key={company.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{company.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    company.role === 'main_contractor'
                      ? 'text-blue-700 bg-blue-50'
                      : 'text-gray-600 bg-gray-100'
                  }`}>
                    {COMPANY_ROLE_LABELS[company.role as CompanyRole] ?? company.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCompany(company.id)}
                    disabled={removingCompanyId === company.id}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {removingCompanyId === company.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
