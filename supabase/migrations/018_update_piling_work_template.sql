-- Update Piling Work (PW) checklist template to match OCP-16 form
-- Replaces generic checklist items with 3 yes/no safety conditions
-- matching the regulatory form. Personnel simplified to workers only.
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Safety Conditions",
      "fields": [
        { "id": "swp_briefed", "type": "yes_no", "label": "SWP briefed to workers involved?", "required": true },
        { "id": "safety_rules_briefed", "type": "yes_no", "label": "In-house Safety Rules & Regulations briefed to workers?", "required": true },
        { "id": "ppe_issued", "type": "yes_no", "label": "Has the required PPE issued to workers?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Piling work site photos (max 5, required)", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "min": 1, "max": 20, "fields": ["name"] }
  ]
}'
WHERE code = 'PW';
