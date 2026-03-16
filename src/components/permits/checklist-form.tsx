'use client'

import { type ChecklistTemplate, type ChecklistField } from '@/lib/permits/checklist-validation'
import { ChecklistPhotoField } from './checklist-photo-field'

interface ChecklistFormProps {
  template: ChecklistTemplate
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  permitId?: string
  disabled?: boolean
}

export function ChecklistForm({ template, data, onChange, permitId, disabled }: ChecklistFormProps) {
  function updateField(fieldId: string, value: unknown) {
    onChange({ ...data, [fieldId]: value })
  }

  const allYesNoFields = template.sections.flatMap((s) =>
    s.fields.filter((f) => f.type === 'yes_no')
  )
  const hasGlobalYesNo = allYesNoFields.length > 1

  function tickAllGlobal(value: 'yes' | 'no' | 'na') {
    const updates = { ...data }
    for (const f of allYesNoFields) {
      updates[f.id] = value
    }
    onChange(updates)
  }

  return (
    <div className="space-y-6">
      {hasGlobalYesNo && !disabled && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Select all checklist items:</span>
          <button type="button" onClick={() => tickAllGlobal('yes')} className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 font-medium">All Yes</button>
          <button type="button" onClick={() => tickAllGlobal('no')} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 font-medium">All No</button>
          <button type="button" onClick={() => tickAllGlobal('na')} className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium">All N.A.</button>
        </div>
      )}
      {template.sections.map((section) => {
        const yesNoFields = section.fields.filter((f) => f.type === 'yes_no')
        const hasYesNo = yesNoFields.length > 1

        function tickAll(value: 'yes' | 'no' | 'na') {
          const updates = { ...data }
          for (const f of yesNoFields) {
            updates[f.id] = value
          }
          onChange(updates)
        }

        return (
          <fieldset key={section.title} className="border border-gray-200 rounded-lg p-4">
            <legend className="text-lg font-semibold px-2">{section.title}</legend>
            {section.description && (
              <p className="text-sm text-gray-500 mt-1 px-2 whitespace-pre-line">{section.description}</p>
            )}
            {hasYesNo && !disabled && (
              <div className="flex gap-2 mt-2 px-2">
                <span className="text-xs text-gray-500 self-center">Quick fill:</span>
                <button type="button" onClick={() => tickAll('yes')} className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">All Yes</button>
                <button type="button" onClick={() => tickAll('no')} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">All No</button>
                <button type="button" onClick={() => tickAll('na')} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200">All N.A.</button>
              </div>
            )}
            <div className="space-y-4 mt-2">
              {section.fields.map((field) => (
                <ChecklistFieldInput
                  key={field.id}
                  field={field}
                  value={data[field.id]}
                  onChange={(value) => updateField(field.id, value)}
                  permitId={permitId}
                  disabled={disabled}
                />
              ))}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}

interface ChecklistFieldInputProps {
  field: ChecklistField
  value: unknown
  onChange: (value: unknown) => void
  permitId?: string
  disabled?: boolean
}

function ChecklistFieldInput({ field, value, onChange, permitId, disabled }: ChecklistFieldInputProps) {
  switch (field.type) {
    case 'checkbox':
      return (
        <label className="flex items-center gap-2">
          <input
            id={field.id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      )

    case 'text':
      return (
        <div>
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            id={field.id}
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )

    case 'date':
      return (
        <div>
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            id={field.id}
            type="date"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )

    case 'select':
      return (
        <div>
          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            id={field.id}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )

    case 'yes_no':
      return (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          <div className="flex gap-4">
            {(['yes', 'no', 'na'] as const).map((option) => (
              <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={() => onChange(option)}
                  disabled={disabled}
                  className="h-4 w-4 text-blue-600 border-gray-300"
                />
                <span className="text-sm">{option === 'yes' ? 'Yes' : option === 'no' ? 'No' : 'N.A.'}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'photo':
      return (
        <ChecklistPhotoField
          field={field}
          value={value}
          onChange={onChange}
          permitId={permitId}
          disabled={disabled}
        />
      )

    default:
      return null
  }
}
