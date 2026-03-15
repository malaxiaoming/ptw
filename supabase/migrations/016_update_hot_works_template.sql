-- Update Hot Works (HW) checklist template to match OCP-05 form
-- Replaces generic checklist items with 24 specific yes/no safety conditions
UPDATE permit_types
SET checklist_template = '{
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
}'
WHERE code = 'HW';
