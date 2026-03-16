-- Generalize personnel roles to a single "Workers" role for all permit types
-- except Lifting Work (which keeps Crane Operator, Rigger, Signalman).

-- Hot Works: replace Hot Work Operators + Fire Watch Person → Workers
UPDATE permit_types
SET checklist_template = jsonb_set(
  checklist_template,
  '{personnel}',
  '[{"role":"worker","label":"Workers","min":1,"max":20,"fields":["name"]}]'::jsonb
)
WHERE code = 'HW';

-- Confined Space: replace Entrant Workers + Watchman → Workers
UPDATE permit_types
SET checklist_template = jsonb_set(
  checklist_template,
  '{personnel}',
  '[{"role":"worker","label":"Workers","min":1,"max":20,"fields":["name"]}]'::jsonb
)
WHERE code = 'CS';

-- Excavation: replace Workers + Equipment Operators → Workers
UPDATE permit_types
SET checklist_template = jsonb_set(
  checklist_template,
  '{personnel}',
  '[{"role":"worker","label":"Workers","min":1,"max":20,"fields":["name"]}]'::jsonb
)
WHERE code = 'EX';

-- Piling Work: already has single worker role, ensure fields is ["name"] only
UPDATE permit_types
SET checklist_template = jsonb_set(
  checklist_template,
  '{personnel}',
  '[{"role":"worker","label":"Workers","min":1,"max":20,"fields":["name"]}]'::jsonb
)
WHERE code = 'PW';

-- Lifting Work (LW): NO CHANGES — keeps Crane Operator, Rigger, Signalman
