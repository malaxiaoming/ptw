-- Update Excavation (EX) checklist to match OCP-10 form
-- Replaces generic checklist items with 7 specific yes/no safety conditions
UPDATE permit_types
SET checklist_template = '{
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
}'
WHERE code = 'EX';
