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
      "title": "Hot Work Safety Checks",
      "fields": [
        { "id": "hot_work_type", "type": "select", "label": "Type of hot work", "required": true, "options": ["Welding", "Cutting", "Brazing", "Grinding", "Soldering"] },
        { "id": "fire_extinguisher", "type": "checkbox", "label": "Fire extinguisher available within 10m?", "required": true },
        { "id": "combustibles_removed", "type": "checkbox", "label": "Combustible materials removed or protected?", "required": true },
        { "id": "fire_watch", "type": "checkbox", "label": "Fire watch person assigned?", "required": true },
        { "id": "ventilation", "type": "checkbox", "label": "Adequate ventilation provided?", "required": true },
        { "id": "gas_test", "type": "checkbox", "label": "Gas test conducted (if applicable)?", "required": false },
        { "id": "site_photo", "type": "photo", "label": "Site condition photos", "required": true, "max": 5 }
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
      "title": "Confined Space Entry Checks",
      "fields": [
        { "id": "space_description", "type": "text", "label": "Description of confined space", "required": true },
        { "id": "atmosphere_tested", "type": "checkbox", "label": "Atmospheric testing completed?", "required": true },
        { "id": "oxygen_level", "type": "text", "label": "Oxygen level (%)", "required": true },
        { "id": "lel_level", "type": "text", "label": "LEL level (%)", "required": true },
        { "id": "h2s_level", "type": "text", "label": "H2S level (ppm)", "required": true },
        { "id": "co_level", "type": "text", "label": "CO level (ppm)", "required": true },
        { "id": "ventilation_provided", "type": "checkbox", "label": "Mechanical ventilation provided?", "required": true },
        { "id": "rescue_equipment", "type": "checkbox", "label": "Rescue equipment available at entry point?", "required": true },
        { "id": "communication_system", "type": "checkbox", "label": "Communication system in place?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Entry point photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "entrant", "label": "Entrants", "min": 1, "max": 5, "fields": ["name", "cert_number"] },
    { "role": "standby", "label": "Standby Person", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Excavation', 'EX', '{
  "sections": [
    {
      "title": "Excavation Safety Checks",
      "fields": [
        { "id": "excavation_depth", "type": "text", "label": "Excavation depth (metres)", "required": true },
        { "id": "underground_services_checked", "type": "checkbox", "label": "Underground services detected and marked?", "required": true },
        { "id": "shoring_installed", "type": "checkbox", "label": "Shoring/support system installed?", "required": true },
        { "id": "barricades", "type": "checkbox", "label": "Barricades and warning signs in place?", "required": true },
        { "id": "access_ladder", "type": "checkbox", "label": "Safe means of access/egress provided?", "required": true },
        { "id": "soil_condition", "type": "text", "label": "Soil condition assessment", "required": true },
        { "id": "water_management", "type": "checkbox", "label": "Water management measures in place?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Excavation site photos", "required": true, "max": 5 }
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
        { "id": "structure_description", "type": "text", "label": "Structure to be demolished", "required": true },
        { "id": "demolition_method", "type": "select", "label": "Demolition method", "required": true, "options": ["Manual", "Mechanical", "Controlled Blasting", "Deconstruction"] },
        { "id": "structural_survey", "type": "checkbox", "label": "Structural survey completed?", "required": true },
        { "id": "asbestos_check", "type": "checkbox", "label": "Asbestos/hazardous material survey completed?", "required": true },
        { "id": "utilities_disconnected", "type": "checkbox", "label": "All utilities disconnected?", "required": true },
        { "id": "exclusion_zone", "type": "checkbox", "label": "Exclusion zone established and barricaded?", "required": true },
        { "id": "dust_control", "type": "checkbox", "label": "Dust suppression measures in place?", "required": true },
        { "id": "debris_management", "type": "checkbox", "label": "Debris management plan in place?", "required": true },
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
