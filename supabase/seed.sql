-- Seed default organization
insert into organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Default Organization')
on conflict (id) do nothing;

-- Seed 7 permit types
insert into permit_types (organization_id, name, code, checklist_template) values

('00000000-0000-0000-0000-000000000001', 'Work-At-Height', 'WAH', '{
  "sections": [
    {
      "title": "Pre-Work Safety Checks",
      "fields": [
        { "id": "swp_briefed", "type": "yes_no", "label": "SWP briefed to workers involved?", "required": true },
        { "id": "safety_rules_briefed", "type": "yes_no", "label": "In-house Safety Rules & Regulations briefed to workers?", "required": true },
        { "id": "ppe_issued", "type": "yes_no", "label": "Has the required PPE issued to workers? (Safety Belt, Safety Harness, etc)", "required": true },
        { "id": "harness_liftline", "type": "yes_no", "label": "Ensure when there is potential falling hazard, safety harness and additional lift line were provided.", "required": true },
        { "id": "liftline_secured", "type": "yes_no", "label": "Lift line was firmly secured to rigid structure when necessary.", "required": true },
        { "id": "hook_briefed", "type": "yes_no", "label": "Workers were briefed to hook their safety belt / harness to secured point (life line, structure, etc)", "required": true },
        { "id": "area_barricaded", "type": "yes_no", "label": "Work area below to be barricade with danger signboard to prevent entry.", "required": true },
        { "id": "harness_condition", "type": "yes_no", "label": "Check to ensure safety belt / harness is not defective.", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Site condition photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "min": 1, "max": 20, "fields": ["name", "trade", "cert_number"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Hot Works', 'HW', '{
  "sections": [
    {
      "title": "Safety Conditions",
      "fields": [
        { "id": "electrical_isolation", "type": "yes_no", "label": "Electrical isolation provided", "required": true },
        { "id": "equipment_isolated", "type": "yes_no", "label": "Equipment isolated", "required": true },
        { "id": "track_isolated", "type": "yes_no", "label": "Track isolated", "required": true },
        { "id": "warning_signals", "type": "yes_no", "label": "Warning signals position", "required": true },
        { "id": "lookout_man", "type": "yes_no", "label": "Lookout man available", "required": true },
        { "id": "explosion_check", "type": "yes_no", "label": "Explosion check", "required": true },
        { "id": "toxic_check", "type": "yes_no", "label": "Toxic check", "required": true },
        { "id": "area_clear_combustibles", "type": "yes_no", "label": "Area clear of combustibles", "required": true },
        { "id": "fire_watcher", "type": "yes_no", "label": "Fire watcher provided", "required": true },
        { "id": "welding_flash_guard", "type": "yes_no", "label": "Welding flash guard required", "required": true },
        { "id": "life_line", "type": "yes_no", "label": "Life line provided with handler", "required": true },
        { "id": "barriers", "type": "yes_no", "label": "Barriers provided", "required": true },
        { "id": "portable_lighting", "type": "yes_no", "label": "Portable lighting", "required": true },
        { "id": "no_smoking", "type": "yes_no", "label": "No smoking or naked flame", "required": true },
        { "id": "scaffolding_access", "type": "yes_no", "label": "Scaffolding / work access provided", "required": true },
        { "id": "first_aid_kit", "type": "yes_no", "label": "First aid kit", "required": true },
        { "id": "fire_extinguisher", "type": "yes_no", "label": "Fire extinguisher", "required": true },
        { "id": "flashback_arrestor", "type": "yes_no", "label": "Flashback arrestor provided & in good condition", "required": true },
        { "id": "cylinder_secured", "type": "yes_no", "label": "Cylinder in upright position & secured", "required": true },
        { "id": "hoses_condition", "type": "yes_no", "label": "Hoses in good condition", "required": true },
        { "id": "gas_regulators", "type": "yes_no", "label": "Gas regulators in good condition", "required": true },
        { "id": "o_clips_secured", "type": "yes_no", "label": "O clips used to secure hoses", "required": true },
        { "id": "equipment_leakage_check", "type": "yes_no", "label": "Equipment check for leakage", "required": true },
        { "id": "no_incompatible_works", "type": "yes_no", "label": "No incompatible works at surroundings", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Hot works site photos (max 5, required)", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Hot Work Operators", "min": 1, "max": 10, "fields": ["name", "trade", "cert_number"] },
    { "role": "fire_watch", "label": "Fire Watch Person", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Confined Space', 'CS', '{
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
}'),

('00000000-0000-0000-0000-000000000001', 'Excavation', 'EX', '{
  "sections": [
    {
      "title": "Safety Conditions",
      "fields": [
        { "id": "swp_briefed", "type": "yes_no", "label": "SWP briefed to workers involved?", "required": true },
        { "id": "safety_rules_briefed", "type": "yes_no", "label": "In-house Safety Rules & Regulations briefed to workers?", "required": true },
        { "id": "ppe_issued", "type": "yes_no", "label": "Has the required PPE issued to workers? (Safety Belt, Safety Harness, etc)", "required": true },
        { "id": "excavation_sloped", "type": "yes_no", "label": "Excavation is sloped according to requirement", "required": true },
        { "id": "no_material_near_edge", "type": "yes_no", "label": "No material or machinery shall be placed near excavation edge", "required": true },
        { "id": "earth_stockpile_compact", "type": "yes_no", "label": "Excess earth stockpile to be compact to prevent further soil erosion", "required": true },
        { "id": "excavation_permit_approved", "type": "yes_no", "label": "Permit for excavation has been approved", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Excavation site photos (max 5, required)", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "min": 1, "max": 20, "fields": ["name", "trade"] },
    { "role": "operator", "label": "Equipment Operators", "min": 0, "max": 5, "fields": ["name", "cert_number"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Lifting Work', 'LW', '{
  "sections": [
    {
      "title": "Lifting Operation Checks",
      "fields": [
        { "id": "lift_description", "type": "text", "label": "Description of lifting operation", "required": true },
        { "id": "load_weight", "type": "text", "label": "Load weight (tonnes)", "required": true },
        { "id": "crane_type", "type": "text", "label": "Crane type and model", "required": true },
        { "id": "crane_capacity", "type": "text", "label": "Crane SWL (tonnes)", "required": true },
        { "id": "lifting_plan", "type": "checkbox", "label": "Lifting plan reviewed and approved?", "required": true },
        { "id": "exclusion_zone", "type": "checkbox", "label": "Exclusion zone barricaded?", "required": true },
        { "id": "slings_inspected", "type": "checkbox", "label": "Slings and rigging gear inspected?", "required": true },
        { "id": "ground_condition", "type": "checkbox", "label": "Ground condition suitable for crane setup?", "required": true },
        { "id": "wind_speed_checked", "type": "checkbox", "label": "Wind speed within safe limits?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Setup photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "crane_operator", "label": "Crane Operator", "min": 1, "max": 2, "fields": ["name", "license_number"] },
    { "role": "rigger", "label": "Rigger", "min": 1, "max": 4, "fields": ["name", "cert_number"] },
    { "role": "signalman", "label": "Signalman", "min": 1, "max": 2, "fields": ["name", "cert_number"] },
    { "role": "banksman", "label": "Banksman", "min": 0, "max": 2, "fields": ["name"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Demolition', 'DM', '{
  "sections": [
    {
      "title": "Demolition Safety Checks",
      "fields": [
        { "id": "hoarding_barricade", "type": "yes_no", "label": "Erect hoarding, adequate barricade and warning signage are provided to prevent unauthorised entry", "required": true },
        { "id": "ppe_used", "type": "yes_no", "label": "Appropriate personal protection equipment are used", "required": true },
        { "id": "service_lines_capped", "type": "yes_no", "label": "Disconnect and cap all the service lines", "required": true },
        { "id": "glass_loose_removed", "type": "yes_no", "label": "Dismantle all glass in the exterior openings, and loose components before commencement of demolition works", "required": true },
        { "id": "hazardous_material_check", "type": "yes_no", "label": "Check and ensure adequate precaution measures has been taken if there is presence of material such as asbestos, lead or mercury", "required": true },
        { "id": "structure_guarded", "type": "yes_no", "label": "All structure must be guarded to prevent falling or collapse", "required": true },
        { "id": "safe_access_exit", "type": "yes_no", "label": "Safe access and exit route to/from any building are provided", "required": true },
        { "id": "demolition_permit_display", "type": "yes_no", "label": "Prominent display of demolition permit", "required": true },
        { "id": "debris_disposal", "type": "yes_no", "label": "Proper material disposal of debris are provided", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Pre-demolition photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Demolition Workers", "min": 1, "max": 20, "fields": ["name", "trade"] },
    { "role": "operator", "label": "Equipment Operators", "min": 0, "max": 5, "fields": ["name", "cert_number"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Piling Work', 'PW', '{
  "sections": [
    {
      "title": "Piling Work Safety Checks",
      "fields": [
        { "id": "pile_type", "type": "select", "label": "Type of piling", "required": true, "options": ["Bored Pile", "Driven Pile", "Sheet Pile", "Micro Pile"] },
        { "id": "pile_depth", "type": "text", "label": "Design pile depth (metres)", "required": true },
        { "id": "underground_services", "type": "checkbox", "label": "Underground services detection completed?", "required": true },
        { "id": "piling_rig_inspected", "type": "checkbox", "label": "Piling rig inspected and certified?", "required": true },
        { "id": "exclusion_zone", "type": "checkbox", "label": "Exclusion zone established?", "required": true },
        { "id": "noise_control", "type": "checkbox", "label": "Noise and vibration control measures in place?", "required": true },
        { "id": "adjacent_structures", "type": "checkbox", "label": "Adjacent structures surveyed and monitored?", "required": true },
        { "id": "spoil_management", "type": "checkbox", "label": "Spoil management plan in place?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Piling site photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "operator", "label": "Piling Rig Operator", "min": 1, "max": 2, "fields": ["name", "cert_number"] },
    { "role": "worker", "label": "Workers", "min": 1, "max": 15, "fields": ["name", "trade"] }
  ]
}')
on conflict (organization_id, code) do nothing;
