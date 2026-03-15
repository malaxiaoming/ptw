-- Update Lifting Work (LW) checklist template to match OCP-12 form
-- Replaces generic checklist items with 8 specific yes/no safety conditions
-- plus crane certificate fields matching the regulatory form
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Safety Conditions",
      "fields": [
        { "id": "valid_lm_cert", "type": "yes_no", "label": "Valid LM certificate for crane", "required": true },
        { "id": "valid_maintenance_report", "type": "yes_no", "label": "Valid periodic maintenance report", "required": true },
        { "id": "operator_daily_check", "type": "yes_no", "label": "Crane operator''s daily check completed", "required": true },
        { "id": "supervisor_daily_check", "type": "yes_no", "label": "Lifting supervisor''s daily check completed", "required": true },
        { "id": "crane_firm_ground", "type": "yes_no", "label": "Crane has been set up on firm ground with its access being in accordance with PE design", "required": true },
        { "id": "safe_distance_excavation", "type": "yes_no", "label": "Crane is at a safe distance from excavations / trenches", "required": true },
        { "id": "lifting_gears_condition", "type": "yes_no", "label": "Lifting gears are in good condition with number tags, and traceable to valid LG certificates", "required": true },
        { "id": "warning_signs_barriers", "type": "yes_no", "label": "Warning signs and barriers provided within hoisting radius", "required": true },
        { "id": "others", "type": "text", "label": "Others", "required": false }
      ]
    },
    {
      "title": "Crane Certificate",
      "fields": [
        { "id": "crane_lm_no", "type": "text", "label": "Crane LM No.", "required": true },
        { "id": "crane_lm_expiry", "type": "date", "label": "Crane LM Expiry Date", "required": true }
      ]
    },
    {
      "title": "Site Photos",
      "fields": [
        { "id": "site_photo", "type": "photo", "label": "Lifting operation site photos (max 5, required)", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "crane_operator", "label": "Crane Operator", "min": 1, "max": 2, "fields": ["name"] },
    { "role": "rigger", "label": "Rigger", "min": 1, "max": 4, "fields": ["name"] },
    { "role": "signalman", "label": "Signalman", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'
WHERE code = 'LW';
