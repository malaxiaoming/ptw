'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChecklistForm } from '@/components/permits/checklist-form'
import { PersonnelPicker } from '@/components/permits/personnel-picker'
import type { ChecklistTemplate, PersonnelEntry } from '@/lib/permits/checklist-validation'

interface Project {
  id: string
  name: string
  location: string | null
}

interface PermitType {
  id: string
  name: string
  code: string
  checklist_template: ChecklistTemplate
}

type Step = 1 | 2 | 3 | 4

export default function NewPermitPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
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
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [checklistData, setChecklistData] = useState<Record<string, unknown>>({})
  const [personnel, setPersonnel] = useState<PersonnelEntry[]>([])

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

  // Load permit types when step 2 is reached
  useEffect(() => {
    if (step === 2 && selectedProjectId) {
      setLoadingTypes(true)
      setSelectedTypeId('')
      setSelectedType(null)
      fetch('/api/permit-types')
        .then((r) => r.json())
        .then((json) => setPermitTypes(json.data ?? []))
        .catch(() => setError('Failed to load permit types'))
        .finally(() => setLoadingTypes(false))
    }
  }, [step, selectedProjectId])

  function handleProjectSelect(projectId: string) {
    setSelectedProjectId(projectId)
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

  function canProceedStep1() {
    return Boolean(selectedProjectId)
  }

  function canProceedStep2() {
    return Boolean(selectedTypeId)
  }

  function canProceedStep3() {
    return Boolean(workLocation.trim()) && Boolean(workDescription.trim())
  }

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

      // Then patch with optional fields if they are set
      const patchBody: Record<string, unknown> = {}
      if (scheduledStart) patchBody.scheduled_start = scheduledStart
      if (scheduledEnd) patchBody.scheduled_end = scheduledEnd
      if (Object.keys(checklistData).length > 0) patchBody.checklist_data = checklistData
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

  const stepLabels = ['Select Project', 'Select Type', 'Work Details', 'Checklist & Personnel']

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
        <h1 className="text-2xl font-bold text-gray-900">New Permit</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {stepLabels.map((label, i) => {
          const stepNum = (i + 1) as Step
          const isActive = step === stepNum
          const isCompleted = step > stepNum
          return (
            <div key={label} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 flex-1 ${i > 0 ? 'pl-2' : ''}`}>
                {i > 0 && (
                  <div className={`h-px flex-1 ${isCompleted || isActive ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
                <div className={`flex items-center gap-1.5 whitespace-nowrap`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive ? 'bg-blue-600 text-white' :
                    isCompleted ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {isCompleted ? '✓' : stepNum}
                  </span>
                  <span className={`text-xs font-medium hidden sm:inline ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-blue-500' : 'text-gray-400'
                  }`}>
                    {label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">

        {/* Step 1: Select Project */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Project</h2>
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
                    {project.location && (
                      <p className="text-sm text-gray-500 mt-0.5">{project.location}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Permit Type */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Permit Type</h2>
            {loadingTypes ? (
              <p className="text-gray-500 text-sm">Loading permit types...</p>
            ) : permitTypes.length === 0 ? (
              <p className="text-gray-500 text-sm">No permit types available for your organisation.</p>
            ) : (
              <div className="space-y-2">
                {permitTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeSelect(type.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedTypeId === type.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{type.code}</span>
                      <p className="font-medium text-gray-900">{type.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Work Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Work Details</h2>

            <div>
              <label htmlFor="work-location" className="block text-sm font-medium text-gray-700 mb-1">
                Work Location <span className="text-red-500">*</span>
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
                Work Description <span className="text-red-500">*</span>
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
                  Scheduled Start
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
                  Scheduled End
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
        )}

        {/* Step 4: Checklist & Personnel */}
        {step === 4 && selectedType && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Checklist & Personnel</h2>

            {selectedType.checklist_template.sections.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Checklist</h3>
                <ChecklistForm
                  template={selectedType.checklist_template}
                  data={checklistData}
                  onChange={setChecklistData}
                />
              </div>
            )}

            {selectedType.checklist_template.personnel.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Personnel</h3>
                <PersonnelPicker
                  requirements={selectedType.checklist_template.personnel}
                  personnel={personnel}
                  onChange={setPersonnel}
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
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => (s > 1 ? (s - 1) as Step : s))}
          disabled={step === 1}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s < 4 ? (s + 1) as Step : s))}
            disabled={
              (step === 1 && !canProceedStep1()) ||
              (step === 2 && !canProceedStep2()) ||
              (step === 3 && !canProceedStep3())
            }
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canProceedStep3()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Permit'}
          </button>
        )}
      </div>
    </div>
  )
}
