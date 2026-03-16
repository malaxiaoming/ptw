-- Fix personnel roles for DM, EX, HW, LW permit types
-- DM: Demolition Workers + Equipment Operators → Workers
-- EX: Remove Equipment Operators, keep Workers
-- HW: Hot Work Operators + Fire Watch Person → Workers
-- LW: Add Lifting Supervisor

-- ============================================================
-- Demolition (DM) — just Workers
-- ============================================================
UPDATE permit_types
SET checklist_template = jsonb_set(
  checklist_template::jsonb,
  '{personnel}',
  '[{ "role": "worker", "label": "Workers", "label_zh": "工人", "min": 1, "max": 20, "fields": ["name"] }]'::jsonb
)
WHERE code = 'DM';

-- ============================================================
-- Excavation (EX) — just Workers
-- ============================================================
UPDATE permit_types
SET checklist_template = jsonb_set(
  checklist_template::jsonb,
  '{personnel}',
  '[{ "role": "worker", "label": "Workers", "label_zh": "工人", "min": 1, "max": 20, "fields": ["name"] }]'::jsonb
)
WHERE code = 'EX';

-- ============================================================
-- Hot Works (HW) — just Workers
-- ============================================================
UPDATE permit_types
SET checklist_template = jsonb_set(
  checklist_template::jsonb,
  '{personnel}',
  '[{ "role": "worker", "label": "Workers", "label_zh": "工人", "min": 1, "max": 20, "fields": ["name"] }]'::jsonb
)
WHERE code = 'HW';

-- ============================================================
-- Lifting Work (LW) — add Lifting Supervisor
-- ============================================================
UPDATE permit_types
SET checklist_template = jsonb_set(
  checklist_template::jsonb,
  '{personnel}',
  '[
    { "role": "crane_operator", "label": "Crane Operator", "label_zh": "起重机操作员", "min": 1, "max": 2, "fields": ["name"] },
    { "role": "rigger", "label": "Rigger", "label_zh": "索具工", "min": 1, "max": 4, "fields": ["name"] },
    { "role": "signalman", "label": "Signalman", "label_zh": "信号员", "min": 1, "max": 2, "fields": ["name"] },
    { "role": "lifting_supervisor", "label": "Lifting Supervisor", "label_zh": "吊装监督员", "min": 1, "max": 2, "fields": ["name"] }
  ]'::jsonb
)
WHERE code = 'LW';
