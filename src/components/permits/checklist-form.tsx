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

  return (
    <div className="space-y-6">
      {template.sections.map((section) => (
        <fieldset key={section.title} className="border border-gray-200 rounded-lg p-4">
          <legend className="text-lg font-semibold px-2">{section.title}</legend>
          {section.description && (
            <p className="text-sm text-gray-500 mt-1 px-2 whitespace-pre-line">{section.description}</p>
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
      ))}
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
