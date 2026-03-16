'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChecklistForm } from '@/components/permits/checklist-form'
import { PersonnelPicker } from '@/components/permits/personnel-picker'
import { validateChecklist } from '@/lib/permits/checklist-validation'
import type { ChecklistTemplate, PersonnelEntry } from '@/lib/permits/checklist-validation'
import { compressImage } from '@/lib/utils/image-compression'
import { defaultScheduledStart, defaultScheduledEnd, datetimeLocalToISO } from '@/lib/utils/date-defaults'
import { BilingualText } from '@/components/ui/bilingual'

interface Project {
  id: string
  name: string
  address: string | null
}

interface PermitType {
  id: string
  name: string
  code: string
  checklist_template: ChecklistTemplate
}

export default function NewPermitPage() {
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [selectedType, setSelectedType] = useState<PermitType | null>(null)
  const [workLocation, setWorkLocation] = useState('')
  const [workDescription, setWorkDescription] = useState('')
  const [scheduledStart, setScheduledStart] = useState(defaultScheduledStart)
  const [scheduledEnd, setScheduledEnd] = useState(defaultScheduledEnd)
  const [checklistData, setChecklistData] = useState<Record<string, unknown>>({})
  const [personnel, setPersonnel] = useState<PersonnelEntry[]>([])
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)
  const [userCompanyRole, setUserCompanyRole] = useState<string | null>(null)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [loadingRole, setLoadingRole] = useState(false)
  const [roleFetched, setRoleFetched] = useState(false)

  // Load user's accessible projects
  useEffect(() => {
    setLoadingProjects(true)
    fetch('/api/projects')
      .then((r) => r.json())
      .then((json) => {
        setProjects(json.data ?? [])
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoadingProjects(false))
  }, [])

  // Load permit types when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      setLoadingTypes(true)
      setSelectedTypeId('')
      setSelectedType(null)
      fetch('/api/permit-types')
        .then((r) => r.json())
        .then((json) => setPermitTypes(json.data ?? []))
        .catch(() => setError('Failed to load permit types'))
        .finally(() => setLoadingTypes(false))
    }
  }, [selectedProjectId])

  // Fetch user's role/company when project changes
  useEffect(() => {
    if (!selectedProjectId) return
    setLoadingRole(true)
    fetch(`/api/projects/${selectedProjectId}/my-role`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setUserCompanyId(json.data.company_id ?? null)
          setUserCompanyRole(json.data.company_role ?? null)
          setUserRoles(json.data.roles ?? [])
        }
      })
      .catch(() => {})
      .finally(() => { setLoadingRole(false); setRoleFetched(true) })
  }, [selectedProjectId])

  const isApplicant = userRoles.includes('applicant')
  const hasCheckedRole = roleFetched && !loadingRole && selectedProjectId !== ''

  function handleProjectSelect(projectId: string) {
    setSelectedProjectId(projectId)
    setUserCompanyId(null)
    setUserCompanyRole(null)
    setUserRoles([])
    setRoleFetched(false)
    setError(null)
  }

  function handleTypeSelect(typeId: string) {
    const type = permitTypes.find((t) => t.id === typeId)
    setSelectedTypeId(typeId)
    setSelectedType(type ?? null)
    setChecklistData({})
    setPersonnel([])
    setError(null)
  }

  const checklistWarnings = useMemo(() => {
    if (!selectedType) return []
    const result = validateChecklist(selectedType.checklist_template, checklistData, personnel)
    return result.errors
  }, [selectedType, checklistData, personnel])

  const canSubmit = Boolean(selectedProjectId && selectedTypeId && workLocation.trim() && workDescription.trim())

  async function handleSubmit() {
    if (!selectedProjectId || !selectedTypeId || !workLocation || !workDescription) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // First, create the permit with required fields
      const createRes = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          permit_type_id: selectedTypeId,
          work_location: workLocation,
          work_description: workDescription,
        }),
      })

      const createJson = await createRes.json()
      if (!createRes.ok) {
        setError(createJson.error ?? 'Failed to create permit')
        return
      }

      const newPermitId = createJson.data.id

      // Upload any staged photo files and replace File[] with attachment ID[]
      const finalChecklistData = { ...checklistData }
      for (const [fieldId, fieldValue] of Object.entries(finalChecklistData)) {
        if (!Array.isArray(fieldValue)) continue
        const files = fieldValue.filter((v): v is File => v instanceof File)
        if (files.length === 0) continue

        const attachmentIds: string[] = fieldValue.filter((v): v is string => typeof v === 'string')
        for (const file of files) {
          const compressed = await compressImage(file)
          const formData = new FormData()
          formData.append('file', compressed)
          const uploadRes = await fetch(`/api/permits/${newPermitId}/attachments`, {
            method: 'POST',
            body: formData,
          })
          const uploadJson = await uploadRes.json()
          if (uploadRes.ok && uploadJson.data?.id) {
            attachmentIds.push(uploadJson.data.id)
          }
        }
        finalChecklistData[fieldId] = attachmentIds
      }

      // Then patch with optional fields if they are set
      const patchBody: Record<string, unknown> = {}
      patchBody.scheduled_start = datetimeLocalToISO(scheduledStart)
      patchBody.scheduled_end = datetimeLocalToISO(scheduledEnd)
      if (Object.keys(finalChecklistData).length > 0) patchBody.checklist_data = finalChecklistData
      if (personnel.length > 0) patchBody.personnel = personnel

      if (Object.keys(patchBody).length > 0) {
        const patchRes = await fetch(`/api/permits/${newPermitId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
        if (!patchRes.ok) {
          // Non-fatal: redirect to the permit anyway
          console.error('Failed to update permit details after creation')
        }
      }

      router.push(`/permits/${newPermitId}`)
    } catch {
      setError('Failed to create permit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push('/permits')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Permits
        </button>
        <h1 className="text-2xl font-bold text-gray-900"><BilingualText en="New Permit" /></h1>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Section 1: Select Project */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900"><BilingualText en="Select Project" /> <span className="text-red-500">*</span></h2>
          {loadingProjects ? (
            <p className="text-gray-500 text-sm">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-gray-500 text-sm">No projects available. You need to be assigned to a project first.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleProjectSelect(project.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedProjectId === project.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{project.name}</p>
                  {project.address && (
                    <p className="text-sm text-gray-500 mt-0.5">{project.address}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Non-applicant warning */}
      {selectedProjectId && hasCheckedRole && !isApplicant && !loadingRole && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800">
            You do not have the Applicant role on this project.
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Only users with the Applicant role can create permits. Contact your project administrator to request access.
          </p>
        </div>
      )}

      {/* Section 2: Select Permit Type */}
      {selectedProjectId && isApplicant && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900"><BilingualText en="Select Permit Type" /> <span className="text-red-500">*</span></h2>
            {loadingTypes ? (
              <p className="text-gray-500 text-sm">Loading permit types...</p>
            ) : permitTypes.length === 0 ? (
              <p className="text-gray-500 text-sm">No permit types available for your organisation.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {permitTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeSelect(type.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                      selectedTypeId === type.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{type.code}</span>
                    <span className="font-medium text-gray-900">{type.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3: Work Details */}
      {selectedTypeId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900"><BilingualText en="Work Details" /></h2>

            <div>
              <label htmlFor="work-location" className="block text-sm font-medium text-gray-700 mb-1">
                <BilingualText en="Work Location" /> <span className="text-red-500">*</span>
              </label>
              <input
                id="work-location"
                type="text"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                placeholder="e.g. Level 3, Grid C-4, Boiler Room"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="work-description" className="block text-sm font-medium text-gray-700 mb-1">
                <BilingualText en="Work Description" /> <span className="text-red-500">*</span>
              </label>
              <textarea
                id="work-description"
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="Describe the work to be performed..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="scheduled-start" className="block text-sm font-medium text-gray-700 mb-1">
                  <BilingualText en="Scheduled Start" />
                </label>
                <input
                  id="scheduled-start"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="scheduled-end" className="block text-sm font-medium text-gray-700 mb-1">
                  <BilingualText en="Scheduled End" />
                </label>
                <input
                  id="scheduled-end"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Checklist & Personnel */}
      {selectedType && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900"><BilingualText en="Checklist & Personnel" /></h2>

            {selectedType.checklist_template.sections.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3"><BilingualText en="Checklist" /></h3>
                <ChecklistForm
                  template={selectedType.checklist_template}
                  data={checklistData}
                  onChange={setChecklistData}
                />
              </div>
            )}

            {selectedType.checklist_template.personnel.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3"><BilingualText en="Personnel" /></h3>
                <PersonnelPicker
                  requirements={selectedType.checklist_template.personnel}
                  personnel={personnel}
                  onChange={setPersonnel}
                  companyId={userCompanyRole === 'main_contractor' ? null : userCompanyId}
                  projectId={selectedProjectId}
                />
              </div>
            )}

            {selectedType.checklist_template.sections.length === 0 &&
             selectedType.checklist_template.personnel.length === 0 && (
              <p className="text-sm text-gray-500 italic">
                This permit type has no checklist or personnel requirements.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Checklist validation warnings */}
      {checklistWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-2">
            The following items need attention before this permit can be submitted:
          </p>
          <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
            {checklistWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating permit...' : <BilingualText en="Create Permit" />}
        </button>
      </div>
    </div>
  )
}
