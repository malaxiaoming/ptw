-- Update Confined Space (CS) permit type to match OCP-24 form
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Safety Conditions",
      "fields": [
        { "id": "soc_attended", "type": "yes_no", "label": "Workers have attended SOC for manhole workers", "required": true },
        { "id": "entry_procedures_briefed", "type": "yes_no", "label": "Workers are briefed on entry and emergency procedures", "required": true },
        { "id": "ppe_provided", "type": "yes_no", "label": "PPE provided - safety harness, lifeline, respiratory protection, etc.", "required": true },
        { "id": "attendance_signboard", "type": "yes_no", "label": "Attendance signboard at entrance is available", "required": true },
        { "id": "watchman_assigned", "type": "yes_no", "label": "Watchman has been assigned at entrance of confined space", "required": true },
        { "id": "place_purged_ventilated", "type": "yes_no", "label": "Place purged and ventilated", "required": true },
        { "id": "gas_test_safe", "type": "yes_no", "label": "Gas test done with atmosphere deemed safe for entry to work", "required": true },
        { "id": "o2_reading_1", "type": "text", "label": "O₂ reading (%) — Test 1", "required": false },
        { "id": "ch4_reading_1", "type": "text", "label": "Combustible gas (CH₄) reading (% LEL) — Test 1", "required": false },
        { "id": "toxicity_reading_1", "type": "text", "label": "Toxicity gas reading (ppm) — Test 1", "required": false },
        { "id": "toxicity_type_1", "type": "text", "label": "Toxicity gas type(s) (CO, H₂S, CO₂) — Test 1", "required": false },
        { "id": "o2_reading_2", "type": "text", "label": "O₂ reading (%) — Test 2", "required": false },
        { "id": "ch4_reading_2", "type": "text", "label": "Combustible gas (CH₄) reading (% LEL) — Test 2", "required": false },
        { "id": "toxicity_reading_2", "type": "text", "label": "Toxicity gas reading (ppm) — Test 2", "required": false },
        { "id": "toxicity_type_2", "type": "text", "label": "Toxicity gas type(s) (CO, H₂S, CO₂) — Test 2", "required": false },
        { "id": "force_ventilation", "type": "yes_no", "label": "Force ventilation provided at ≥ 1.4m³/min per person", "required": true },
        { "id": "rescue_equipment_tested", "type": "yes_no", "label": "Rescue equipment tested", "required": true },
        { "id": "electrical_tools_approved", "type": "yes_no", "label": "Electrical tools of flame proof and approved type", "required": true },
        { "id": "exhaust_directed_away", "type": "yes_no", "label": "Exhaust from internal combustion engines directed away by a qualified person", "required": true },
        { "id": "work_platform_provided", "type": "yes_no", "label": "Work requiring work platform / ladders is accordingly provided", "required": true },
        { "id": "lockout_tagout", "type": "yes_no", "label": "Lock-out and tag-out procedure complied for maintenance works", "required": true }
      ]
    },
    {
      "title": "Inspection by Confined Space Safety Assessor",
      "fields": [
        { "id": "assessor_name", "type": "text", "label": "Assessor name", "required": true },
        { "id": "assessor_date", "type": "date", "label": "Inspection date", "required": true },
        { "id": "assessor_result", "type": "select", "label": "Result", "required": true, "options": ["SAFE", "UNSAFE"] }
      ]
    },
    {
      "title": "Inspection by Appointed Manhole Supervisor",
      "fields": [
        { "id": "supervisor_name", "type": "text", "label": "Manhole Supervisor name", "required": true },
        { "id": "supervisor_date", "type": "date", "label": "Inspection date", "required": true },
        { "id": "supervisor_result", "type": "select", "label": "Result", "required": true, "options": ["ACCEPT", "REJECT"] }
      ]
    },
    {
      "title": "Safety Briefing",
      "description": "1. No smoking or naked flame in or near the confined space.\n2. Only approved lighting, electrical equipment and tools are used.\n3. Only approved respiratory protection equipment to be used.\n4. Continuous ventilation is necessary at all times.\n5. At least two workers must be engaged at any one time.\n6. A watchman must be stationed outside the entrance of the confined space.\n7. Gas testing must be carried out at intervals not exceeding 2 hours.\n8. All workers must leave the confined space when gas testing is being carried out.\n9. All workers must immediately leave the confined space if there is reason to suspect the atmosphere is unsafe.\n10. Safety harness and lifeline must be attached to every worker entering the confined space.\n11. Emergency rescue procedures must be followed in the event of an emergency.",
      "fields": [
        { "id": "briefing_acknowledged", "type": "yes_no", "label": "All workers have been briefed and acknowledge the above safety rules", "required": true },
        { "id": "briefing_conducted_by", "type": "text", "label": "Safety Briefing conducted by (Name of Assessor/Supervisor)", "required": true }
      ]
    },
    {
      "title": "Site Photos",
      "fields": [
        { "id": "site_photo", "type": "photo", "label": "Confined space entry point photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "entrant", "label": "Entrant Workers", "min": 2, "max": 7, "fields": ["name", "worker_id"] },
    { "role": "watchman", "label": "Watchman / Standby Person", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'
WHERE code = 'CS';
