export interface ChecklistField {
  id: string
  type: 'checkbox' | 'text' | 'date' | 'photo' | 'select' | 'yes_no'
  label: string
  required: boolean
  max?: number
  options?: string[]
}

export interface ChecklistSection {
  title: string
  description?: string
  fields: ChecklistField[]
}

export interface PersonnelRequirement {
  role: string
  label: string
  min: number
  max: number
  fields: string[]
}

export interface ChecklistTemplate {
  sections: ChecklistSection[]
  personnel: PersonnelRequirement[]
}

export interface PersonnelEntry {
  role: string
  worker_id?: string
  name: string
  [key: string]: unknown
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateChecklist(
  template: ChecklistTemplate,
  data: Record<string, unknown>,
  personnel: PersonnelEntry[]
): ValidationResult {
  const errors: string[] = []

  // Validate checklist fields
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!field.required) continue

      const value = data[field.id]

      if (field.type === 'checkbox') {
        if (value !== true) {
          errors.push(`${field.label} must be checked`)
        }
      } else if (field.type === 'yes_no') {
        if (value !== 'yes' && value !== 'no' && value !== 'na') {
          errors.push(`${field.label} must be answered Yes, No, or N.A.`)
        } else if (value === 'no') {
          errors.push(`${field.label} cannot be "No" — condition must be safe or N.A. to proceed`)
        }
      } else if (field.type === 'photo') {
        if (!Array.isArray(value) || value.length === 0) {
          errors.push(`${field.label} is required`)
        } else if (field.max && value.length > field.max) {
          errors.push(`${field.label} can have at most ${field.max} photos`)
        }
      } else {
        if (value === undefined || value === null || value === '') {
          errors.push(`${field.label} is required`)
        }
      }
    }
  }

  // Validate personnel requirements
  for (const req of template.personnel) {
    const matching = personnel.filter((p) => p.role === req.role)
    if (matching.length < req.min) {
      errors.push(`At least ${req.min} ${req.label} required`)
    }
    if (matching.length > req.max) {
      errors.push(`Maximum ${req.max} ${req.label} allowed`)
    }
  }

  return { valid: errors.length === 0, errors }
}
