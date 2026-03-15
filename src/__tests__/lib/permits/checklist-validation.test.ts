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

  describe('yes_no field type', () => {
    const yesNoTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Safety Checks',
          fields: [
            { id: 'briefed', type: 'yes_no', label: 'SWP briefed to workers?', required: true },
            { id: 'optional_check', type: 'yes_no', label: 'Optional check', required: false },
          ],
        },
      ],
      personnel: [],
    }

    it('passes when required yes_no field is answered yes', () => {
      const result = validateChecklist(yesNoTemplate, { briefed: 'yes' }, [])
      expect(result.valid).toBe(true)
    })

    it('fails when required yes_no field is answered no', () => {
      const result = validateChecklist(yesNoTemplate, { briefed: 'no' }, [])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('SWP briefed to workers? cannot be "No" — condition must be safe or N.A. to proceed')
    })

    it('passes when required yes_no field is answered na', () => {
      const result = validateChecklist(yesNoTemplate, { briefed: 'na' }, [])
      expect(result.valid).toBe(true)
    })

    it('passes when non-required yes_no field is answered no', () => {
      const result = validateChecklist(yesNoTemplate, { briefed: 'yes', optional_check: 'no' }, [])
      expect(result.valid).toBe(true)
    })

    it('fails when required yes_no field is unanswered', () => {
      const result = validateChecklist(yesNoTemplate, { briefed: '' }, [])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('SWP briefed to workers? must be answered Yes, No, or N.A.')
    })

    it('fails when required yes_no field is missing', () => {
      const result = validateChecklist(yesNoTemplate, {}, [])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('SWP briefed to workers? must be answered Yes, No, or N.A.')
    })

    it('passes when optional yes_no field is unanswered', () => {
      const result = validateChecklist(yesNoTemplate, { briefed: 'yes', optional_check: '' }, [])
      expect(result.valid).toBe(true)
    })
  })

  describe('section description property', () => {
    it('does not affect validation when description is present', () => {
      const templateWithDescription: ChecklistTemplate = {
        sections: [
          {
            title: 'Safety Briefing',
            description: '1. No smoking.\n2. Wear PPE at all times.',
            fields: [
              { id: 'acknowledged', type: 'yes_no', label: 'Acknowledged', required: true },
            ],
          },
        ],
        personnel: [],
      }
      const result = validateChecklist(templateWithDescription, { acknowledged: 'yes' }, [])
      expect(result.valid).toBe(true)
    })

    it('still validates fields in sections with description', () => {
      const templateWithDescription: ChecklistTemplate = {
        sections: [
          {
            title: 'Safety Briefing',
            description: 'Some rules here.',
            fields: [
              { id: 'acknowledged', type: 'yes_no', label: 'Acknowledged', required: true },
            ],
          },
        ],
        personnel: [],
      }
      const result = validateChecklist(templateWithDescription, {}, [])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Acknowledged must be answered Yes, No, or N.A.')
    })
  })

  describe('Confined Space (OCP-24) template validation', () => {
    const csTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Safety Conditions',
          fields: [
            { id: 'soc_attended', type: 'yes_no', label: 'SOC attended', required: true },
            { id: 'entry_procedures_briefed', type: 'yes_no', label: 'Entry procedures briefed', required: true },
            { id: 'ppe_provided', type: 'yes_no', label: 'PPE provided', required: true },
            { id: 'attendance_signboard', type: 'yes_no', label: 'Attendance signboard', required: true },
            { id: 'watchman_assigned', type: 'yes_no', label: 'Watchman assigned', required: true },
            { id: 'place_purged_ventilated', type: 'yes_no', label: 'Purged and ventilated', required: true },
            { id: 'gas_test_safe', type: 'yes_no', label: 'Gas test safe', required: true },
            { id: 'o2_reading_1', type: 'text', label: 'O₂ reading — Test 1', required: false },
            { id: 'ch4_reading_1', type: 'text', label: 'CH₄ reading — Test 1', required: false },
            { id: 'toxicity_reading_1', type: 'text', label: 'Toxicity reading — Test 1', required: false },
            { id: 'toxicity_type_1', type: 'text', label: 'Toxicity type — Test 1', required: false },
            { id: 'o2_reading_2', type: 'text', label: 'O₂ reading — Test 2', required: false },
            { id: 'ch4_reading_2', type: 'text', label: 'CH₄ reading — Test 2', required: false },
            { id: 'toxicity_reading_2', type: 'text', label: 'Toxicity reading — Test 2', required: false },
            { id: 'toxicity_type_2', type: 'text', label: 'Toxicity type — Test 2', required: false },
            { id: 'force_ventilation', type: 'yes_no', label: 'Force ventilation', required: true },
            { id: 'rescue_equipment_tested', type: 'yes_no', label: 'Rescue equipment tested', required: true },
            { id: 'electrical_tools_approved', type: 'yes_no', label: 'Electrical tools approved', required: true },
            { id: 'exhaust_directed_away', type: 'yes_no', label: 'Exhaust directed away', required: true },
            { id: 'work_platform_provided', type: 'yes_no', label: 'Work platform provided', required: true },
            { id: 'lockout_tagout', type: 'yes_no', label: 'Lock-out tag-out', required: true },
          ],
        },
        {
          title: 'Assessor Inspection',
          fields: [
            { id: 'assessor_name', type: 'text', label: 'Assessor name', required: true },
            { id: 'assessor_date', type: 'date', label: 'Inspection date', required: true },
            { id: 'assessor_result', type: 'select', label: 'Result', required: true, options: ['SAFE', 'UNSAFE'] },
          ],
        },
        {
          title: 'Supervisor Inspection',
          fields: [
            { id: 'supervisor_name', type: 'text', label: 'Supervisor name', required: true },
            { id: 'supervisor_date', type: 'date', label: 'Inspection date', required: true },
            { id: 'supervisor_result', type: 'select', label: 'Result', required: true, options: ['ACCEPT', 'REJECT'] },
          ],
        },
        {
          title: 'Safety Briefing',
          description: 'Safety rules...',
          fields: [
            { id: 'briefing_acknowledged', type: 'yes_no', label: 'Briefing acknowledged', required: true },
            { id: 'briefing_conducted_by', type: 'text', label: 'Conducted by', required: true },
          ],
        },
        {
          title: 'Site Photos',
          fields: [
            { id: 'site_photo', type: 'photo', label: 'Site photos', required: true, max: 5 },
          ],
        },
      ],
      personnel: [
        { role: 'entrant', label: 'Entrant Workers', min: 2, max: 7, fields: ['name', 'worker_id'] },
        { role: 'watchman', label: 'Watchman / Standby Person', min: 1, max: 2, fields: ['name'] },
      ],
    }

    function makeValidCSData(): Record<string, unknown> {
      const yesFields = [
        'soc_attended', 'entry_procedures_briefed', 'ppe_provided',
        'attendance_signboard', 'watchman_assigned', 'place_purged_ventilated',
        'gas_test_safe', 'force_ventilation', 'rescue_equipment_tested',
        'electrical_tools_approved', 'exhaust_directed_away',
        'work_platform_provided', 'lockout_tagout', 'briefing_acknowledged',
      ]
      const data: Record<string, unknown> = {}
      for (const f of yesFields) data[f] = 'yes'
      data['assessor_name'] = 'John Doe'
      data['assessor_date'] = '2026-03-15'
      data['assessor_result'] = 'SAFE'
      data['supervisor_name'] = 'Jane Smith'
      data['supervisor_date'] = '2026-03-15'
      data['supervisor_result'] = 'ACCEPT'
      data['briefing_conducted_by'] = 'John Doe'
      data['site_photo'] = ['photo1.jpg']
      return data
    }

    const validPersonnel: PersonnelEntry[] = [
      { role: 'entrant', name: 'Worker A', worker_id: 'W001' },
      { role: 'entrant', name: 'Worker B', worker_id: 'W002' },
      { role: 'watchman', name: 'Watch C' },
    ]

    it('passes with all 13 safety conditions answered yes and valid data', () => {
      const result = validateChecklist(csTemplate, makeValidCSData(), validPersonnel)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('gas reading fields are optional and do not cause errors when empty', () => {
      const data = makeValidCSData()
      // Gas reading fields are not set — should still pass
      expect(data['o2_reading_1']).toBeUndefined()
      const result = validateChecklist(csTemplate, data, validPersonnel)
      expect(result.valid).toBe(true)
    })

    it('assessor_result validated as required select field', () => {
      const data = makeValidCSData()
      data['assessor_result'] = ''
      const result = validateChecklist(csTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Result is required')
    })

    it('supervisor_result validated as required select field', () => {
      const data = makeValidCSData()
      data['supervisor_result'] = ''
      const result = validateChecklist(csTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Result is required')
    })

    it('fails when fewer than 2 entrant workers', () => {
      const data = makeValidCSData()
      const personnel = [
        { role: 'entrant', name: 'Worker A', worker_id: 'W001' },
        { role: 'watchman', name: 'Watch C' },
      ]
      const result = validateChecklist(csTemplate, data, personnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 2 Entrant Workers required')
    })

    it('fails when no watchman', () => {
      const data = makeValidCSData()
      const personnel = [
        { role: 'entrant', name: 'Worker A', worker_id: 'W001' },
        { role: 'entrant', name: 'Worker B', worker_id: 'W002' },
      ]
      const result = validateChecklist(csTemplate, data, personnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 Watchman / Standby Person required')
    })
  })

  describe('Hot Works (OCP-05) template validation', () => {
    const hwYesNoFields = [
      'electrical_isolation', 'equipment_isolated', 'track_isolated',
      'warning_signals', 'lookout_man', 'explosion_check', 'toxic_check',
      'area_clear_combustibles', 'fire_watcher', 'welding_flash_guard',
      'life_line', 'barriers', 'portable_lighting', 'no_smoking',
      'scaffolding_access', 'first_aid_kit', 'fire_extinguisher',
      'flashback_arrestor', 'cylinder_secured', 'hoses_condition',
      'gas_regulators', 'o_clips_secured', 'equipment_leakage_check',
      'no_incompatible_works',
    ]

    const hwTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Safety Conditions',
          fields: [
            ...hwYesNoFields.map((id) => ({
              id,
              type: 'yes_no' as const,
              label: id.replace(/_/g, ' '),
              required: true,
            })),
            { id: 'site_photo', type: 'photo' as const, label: 'Hot works site photos', required: true, max: 5 },
          ],
        },
      ],
      personnel: [
        { role: 'worker', label: 'Hot Work Operators', min: 1, max: 10, fields: ['name', 'trade', 'cert_number'] },
        { role: 'fire_watch', label: 'Fire Watch Person', min: 1, max: 2, fields: ['name'] },
      ],
    }

    function makeValidHWData(): Record<string, unknown> {
      const data: Record<string, unknown> = {}
      for (const f of hwYesNoFields) data[f] = 'yes'
      data['site_photo'] = ['photo1.jpg']
      return data
    }

    const validPersonnel: PersonnelEntry[] = [
      { role: 'worker', name: 'Welder A', trade: 'Welding', cert_number: 'W001' },
      { role: 'fire_watch', name: 'Watch B' },
    ]

    it('passes with all 24 safety conditions answered yes', () => {
      const result = validateChecklist(hwTemplate, makeValidHWData(), validPersonnel)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when a required yes_no field is missing', () => {
      const data = makeValidHWData()
      delete data['flashback_arrestor']
      const result = validateChecklist(hwTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('flashback arrestor'))).toBe(true)
    })

    it('fails when site photo is empty', () => {
      const data = makeValidHWData()
      data['site_photo'] = []
      const result = validateChecklist(hwTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Hot works site photos is required')
    })

    it('fails when no hot work operators provided', () => {
      const personnel = [{ role: 'fire_watch', name: 'Watch B' }]
      const result = validateChecklist(hwTemplate, makeValidHWData(), personnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 Hot Work Operators required')
    })

    it('fails when no fire watch person provided', () => {
      const personnel = [{ role: 'worker', name: 'Welder A', trade: 'Welding', cert_number: 'W001' }]
      const result = validateChecklist(hwTemplate, makeValidHWData(), personnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 Fire Watch Person required')
    })
  })

  describe('Lifting Work (OCP-12) template validation', () => {
    const lwYesNoFields = [
      'valid_lm_cert', 'valid_maintenance_report', 'operator_daily_check',
      'supervisor_daily_check', 'crane_firm_ground', 'safe_distance_excavation',
      'lifting_gears_condition', 'warning_signs_barriers',
    ]

    const lwTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Safety Conditions',
          fields: [
            ...lwYesNoFields.map((id) => ({
              id,
              type: 'yes_no' as const,
              label: id.replace(/_/g, ' '),
              required: true,
            })),
            { id: 'others', type: 'text' as const, label: 'Others', required: false },
          ],
        },
        {
          title: 'Crane Certificate',
          fields: [
            { id: 'crane_lm_no', type: 'text' as const, label: 'Crane LM No.', required: true },
            { id: 'crane_lm_expiry', type: 'date' as const, label: 'Crane LM Expiry Date', required: true },
          ],
        },
        {
          title: 'Site Photos',
          fields: [
            { id: 'site_photo', type: 'photo' as const, label: 'Lifting operation site photos', required: true, max: 5 },
          ],
        },
      ],
      personnel: [
        { role: 'crane_operator', label: 'Crane Operator', min: 1, max: 2, fields: ['name'] },
        { role: 'rigger', label: 'Rigger', min: 1, max: 4, fields: ['name'] },
        { role: 'signalman', label: 'Signalman', min: 1, max: 2, fields: ['name'] },
      ],
    }

    function makeValidLWData(): Record<string, unknown> {
      const data: Record<string, unknown> = {}
      for (const f of lwYesNoFields) data[f] = 'yes'
      data['crane_lm_no'] = 'LM-2026-001'
      data['crane_lm_expiry'] = '2027-03-15'
      data['site_photo'] = ['photo1.jpg']
      return data
    }

    const validPersonnel: PersonnelEntry[] = [
      { role: 'crane_operator', name: 'Operator A' },
      { role: 'rigger', name: 'Rigger B' },
      { role: 'signalman', name: 'Signal C' },
    ]

    it('passes with all 8 safety conditions answered yes and valid data', () => {
      const result = validateChecklist(lwTemplate, makeValidLWData(), validPersonnel)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when a required yes_no field is missing', () => {
      const data = makeValidLWData()
      delete data['crane_firm_ground']
      const result = validateChecklist(lwTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('crane firm ground'))).toBe(true)
    })

    it('fails when crane LM number is empty', () => {
      const data = makeValidLWData()
      data['crane_lm_no'] = ''
      const result = validateChecklist(lwTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Crane LM No. is required')
    })

    it('fails when crane LM expiry date is empty', () => {
      const data = makeValidLWData()
      data['crane_lm_expiry'] = ''
      const result = validateChecklist(lwTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Crane LM Expiry Date is required')
    })

    it('fails when site photo is empty', () => {
      const data = makeValidLWData()
      data['site_photo'] = []
      const result = validateChecklist(lwTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Lifting operation site photos is required')
    })

    it('others field is optional', () => {
      const data = makeValidLWData()
      // others not set — should still pass
      const result = validateChecklist(lwTemplate, data, validPersonnel)
      expect(result.valid).toBe(true)
    })

    it('fails when no crane operator provided', () => {
      const personnel = [
        { role: 'rigger', name: 'Rigger B' },
        { role: 'signalman', name: 'Signal C' },
      ]
      const result = validateChecklist(lwTemplate, makeValidLWData(), personnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 Crane Operator required')
    })

    it('fails when no rigger provided', () => {
      const personnel = [
        { role: 'crane_operator', name: 'Operator A' },
        { role: 'signalman', name: 'Signal C' },
      ]
      const result = validateChecklist(lwTemplate, makeValidLWData(), personnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 Rigger required')
    })

    it('fails when no signalman provided', () => {
      const personnel = [
        { role: 'crane_operator', name: 'Operator A' },
        { role: 'rigger', name: 'Rigger B' },
      ]
      const result = validateChecklist(lwTemplate, makeValidLWData(), personnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 Signalman required')
    })
  })

  describe('Piling Work (OCP-16) template validation', () => {
    const pwYesNoFields = ['swp_briefed', 'safety_rules_briefed', 'ppe_issued']

    const pwTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Safety Conditions',
          fields: [
            ...pwYesNoFields.map((id) => ({
              id,
              type: 'yes_no' as const,
              label: id.replace(/_/g, ' '),
              required: true,
            })),
            { id: 'site_photo', type: 'photo' as const, label: 'Piling work site photos', required: true, max: 5 },
          ],
        },
      ],
      personnel: [
        { role: 'worker', label: 'Workers', min: 1, max: 20, fields: ['name'] },
      ],
    }

    function makeValidPWData(): Record<string, unknown> {
      const data: Record<string, unknown> = {}
      for (const f of pwYesNoFields) data[f] = 'yes'
      data['site_photo'] = ['photo1.jpg']
      return data
    }

    const validPersonnel: PersonnelEntry[] = [
      { role: 'worker', name: 'Worker A' },
    ]

    it('passes with all 3 safety conditions answered yes and site photo', () => {
      const result = validateChecklist(pwTemplate, makeValidPWData(), validPersonnel)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when a required yes_no field is missing', () => {
      const data = makeValidPWData()
      delete data['ppe_issued']
      const result = validateChecklist(pwTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('ppe issued'))).toBe(true)
    })

    it('fails when site photo is empty', () => {
      const data = makeValidPWData()
      data['site_photo'] = []
      const result = validateChecklist(pwTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Piling work site photos is required')
    })

    it('fails when no workers provided', () => {
      const result = validateChecklist(pwTemplate, makeValidPWData(), [])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 Workers required')
    })
  })

  describe('Excavation (OCP-10) template validation', () => {
    const exTemplate: ChecklistTemplate = {
      sections: [
        {
          title: 'Safety Conditions',
          fields: [
            { id: 'swp_briefed', type: 'yes_no', label: 'SWP briefed to workers involved?', required: true },
            { id: 'safety_rules_briefed', type: 'yes_no', label: 'In-house Safety Rules & Regulations briefed to workers?', required: true },
            { id: 'ppe_issued', type: 'yes_no', label: 'Has the required PPE issued to workers?', required: true },
            { id: 'excavation_sloped', type: 'yes_no', label: 'Excavation is sloped according to requirement', required: true },
            { id: 'no_material_near_edge', type: 'yes_no', label: 'No material or machinery shall be placed near excavation edge', required: true },
            { id: 'earth_stockpile_compact', type: 'yes_no', label: 'Excess earth stockpile to be compact to prevent further soil erosion', required: true },
            { id: 'excavation_permit_approved', type: 'yes_no', label: 'Permit for excavation has been approved', required: true },
            { id: 'site_photo', type: 'photo', label: 'Excavation site photos', required: true, max: 5 },
          ],
        },
      ],
      personnel: [
        { role: 'worker', label: 'Workers', min: 1, max: 20, fields: ['name', 'trade'] },
        { role: 'operator', label: 'Equipment Operators', min: 0, max: 5, fields: ['name', 'cert_number'] },
      ],
    }

    const exYesNoFields = [
      'swp_briefed', 'safety_rules_briefed', 'ppe_issued',
      'excavation_sloped', 'no_material_near_edge',
      'earth_stockpile_compact', 'excavation_permit_approved',
    ]

    function makeValidEXData(): Record<string, unknown> {
      const data: Record<string, unknown> = {}
      for (const f of exYesNoFields) data[f] = 'yes'
      data['site_photo'] = ['photo1.jpg']
      return data
    }

    const validPersonnel: PersonnelEntry[] = [
      { role: 'worker', name: 'Worker A', trade: 'General' },
    ]

    it('passes with all 7 safety conditions answered yes and site photo', () => {
      const result = validateChecklist(exTemplate, makeValidEXData(), validPersonnel)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('fails when a required yes_no field is missing', () => {
      const data = makeValidEXData()
      delete data['excavation_sloped']
      const result = validateChecklist(exTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Excavation is sloped according to requirement must be answered Yes, No, or N.A.')
    })

    it('fails when site photo is empty', () => {
      const data = makeValidEXData()
      data['site_photo'] = []
      const result = validateChecklist(exTemplate, data, validPersonnel)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Excavation site photos is required')
    })

    it('fails when no workers provided', () => {
      const result = validateChecklist(exTemplate, makeValidEXData(), [])
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least 1 Workers required')
    })

    it('passes with zero equipment operators (min is 0)', () => {
      const result = validateChecklist(exTemplate, makeValidEXData(), validPersonnel)
      expect(result.valid).toBe(true)
    })
  })
})
