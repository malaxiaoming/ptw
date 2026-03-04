import { describe, it, expect } from 'vitest'
import { validateChecklist, type ChecklistTemplate, type PersonnelEntry } from '@/lib/permits/checklist-validation'

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
    const personnel: PersonnelEntry[] = []
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('At least 1 Workers required')
  })

  it('fails when required photo field is empty', () => {
    const photoTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Photos',
          fields: [
            { id: 'site_photo', type: 'photo', label: 'Site photo', required: true },
          ],
        },
      ],
      personnel: [],
    }
    const result = validateChecklist(photoTemplate, {}, [])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Site photo is required')
  })

  it('passes when required photo field has at least one photo', () => {
    const photoTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Photos',
          fields: [
            { id: 'site_photo', type: 'photo', label: 'Site photo', required: true },
          ],
        },
      ],
      personnel: [],
    }
    const result = validateChecklist(photoTemplate, { site_photo: ['file-id-1'] }, [])
    expect(result.valid).toBe(true)
  })

  it('fails when maximum personnel exceeded', () => {
    const data = { harness: true, location: 'Level 5' }
    const personnel = Array.from({ length: 11 }, (_, i) => ({
      role: 'worker',
      name: `Worker ${i + 1}`,
      cert_number: `C00${i + 1}`,
    }))
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Maximum 10 Workers allowed')
  })

  it('fails when required select field is empty', () => {
    const selectTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Work Type',
          fields: [
            { id: 'work_type', type: 'select', label: 'Work type', required: true, options: ['Electrical', 'Mechanical'] },
          ],
        },
      ],
      personnel: [],
    }
    const result = validateChecklist(selectTemplate, { work_type: '' }, [])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Work type is required')
  })

  it('fails when required date field is empty', () => {
    const dateTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Schedule',
          fields: [
            { id: 'start_date', type: 'date', label: 'Start date', required: true },
          ],
        },
      ],
      personnel: [],
    }
    const result = validateChecklist(dateTemplate, { start_date: '' }, [])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Start date is required')
  })

  it('fails when photo count exceeds maximum', () => {
    const photoTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Photos',
          fields: [
            { id: 'site_photo', type: 'photo', label: 'Site photo', required: true, max: 2 },
          ],
        },
      ],
      personnel: [],
    }
    const result = validateChecklist(photoTemplate, { site_photo: ['a', 'b', 'c'] }, [])
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Site photo can have at most 2 photos')
  })
})
