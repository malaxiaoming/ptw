import { describe, it, expect } from 'vitest'
import { validateChecklist, type ChecklistTemplate } from '@/lib/permits/checklist-validation'

const template: ChecklistTemplate = {
  sections: [
    {
      title: 'Safety Checks',
      fields: [
        { id: 'harness', type: 'checkbox', label: 'Harness inspected?', required: true },
        { id: 'location', type: 'text', label: 'Work location', required: true },
        { id: 'notes', type: 'text', label: 'Additional notes', required: false },
      ],
    },
  ],
  personnel: [
    { role: 'worker', label: 'Workers', min: 1, max: 10, fields: ['name', 'cert_number'] },
  ],
}

describe('validateChecklist', () => {
  it('passes with all required fields filled', () => {
    const data = { harness: true, location: 'Level 5' }
    const personnel = [{ role: 'worker', name: 'John', cert_number: 'C001' }]
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(true)
  })

  it('fails when required checkbox is unchecked', () => {
    const data = { harness: false, location: 'Level 5' }
    const personnel = [{ role: 'worker', name: 'John', cert_number: 'C001' }]
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Harness inspected? must be checked')
  })

  it('fails when required text field is empty', () => {
    const data = { harness: true, location: '' }
    const personnel = [{ role: 'worker', name: 'John', cert_number: 'C001' }]
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Work location is required')
  })

  it('passes when optional field is empty', () => {
    const data = { harness: true, location: 'Level 5', notes: '' }
    const personnel = [{ role: 'worker', name: 'John', cert_number: 'C001' }]
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(true)
  })

  it('fails when minimum personnel not met', () => {
    const data = { harness: true, location: 'Level 5' }
    const personnel: unknown[] = []
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('At least 1 Workers required')
  })
})
