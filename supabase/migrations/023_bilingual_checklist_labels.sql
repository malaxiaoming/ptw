-- Add bilingual (Chinese) labels to all permit type checklist templates
-- Adds label_zh, title_zh, description_zh fields alongside existing English text

-- ============================================================
-- Confined Space (CS) — OCP-24
-- ============================================================
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Safety Conditions",
      "title_zh": "安全条件",
      "fields": [
        { "id": "soc_attended", "type": "yes_no", "label": "Workers have attended SOC for manhole workers", "label_zh": "工人已参加密闭空间安全意识课程", "required": true },
        { "id": "entry_procedures_briefed", "type": "yes_no", "label": "Workers are briefed on entry and emergency procedures", "label_zh": "工人已了解进入及紧急程序", "required": true },
        { "id": "ppe_provided", "type": "yes_no", "label": "PPE provided - safety harness, lifeline, respiratory protection, etc.", "label_zh": "已提供个人防护装备 - 安全带、救生索、呼吸防护等", "required": true },
        { "id": "attendance_signboard", "type": "yes_no", "label": "Attendance signboard at entrance is available", "label_zh": "入口处设有出勤告示牌", "required": true },
        { "id": "watchman_assigned", "type": "yes_no", "label": "Watchman has been assigned at entrance of confined space", "label_zh": "已在密闭空间入口指派看守人", "required": true },
        { "id": "place_purged_ventilated", "type": "yes_no", "label": "Place purged and ventilated", "label_zh": "场所已清洗和通风", "required": true },
        { "id": "gas_test_safe", "type": "yes_no", "label": "Gas test done with atmosphere deemed safe for entry to work", "label_zh": "已进行气体测试，大气环境被认定安全可进入工作", "required": true },
        { "id": "o2_reading_1", "type": "text", "label": "O₂ reading (%) — Test 1", "label_zh": "氧气读数 (%) — 测试 1", "required": false },
        { "id": "ch4_reading_1", "type": "text", "label": "Combustible gas (CH₄) reading (% LEL) — Test 1", "label_zh": "可燃气体 (CH₄) 读数 (% LEL) — 测试 1", "required": false },
        { "id": "toxicity_reading_1", "type": "text", "label": "Toxicity gas reading (ppm) — Test 1", "label_zh": "有毒气体读数 (ppm) — 测试 1", "required": false },
        { "id": "toxicity_type_1", "type": "text", "label": "Toxicity gas type(s) (CO, H₂S, CO₂) — Test 1", "label_zh": "有毒气体种类 (CO, H₂S, CO₂) — 测试 1", "required": false },
        { "id": "o2_reading_2", "type": "text", "label": "O₂ reading (%) — Test 2", "label_zh": "氧气读数 (%) — 测试 2", "required": false },
        { "id": "ch4_reading_2", "type": "text", "label": "Combustible gas (CH₄) reading (% LEL) — Test 2", "label_zh": "可燃气体 (CH₄) 读数 (% LEL) — 测试 2", "required": false },
        { "id": "toxicity_reading_2", "type": "text", "label": "Toxicity gas reading (ppm) — Test 2", "label_zh": "有毒气体读数 (ppm) — 测试 2", "required": false },
        { "id": "toxicity_type_2", "type": "text", "label": "Toxicity gas type(s) (CO, H₂S, CO₂) — Test 2", "label_zh": "有毒气体种类 (CO, H₂S, CO₂) — 测试 2", "required": false },
        { "id": "force_ventilation", "type": "yes_no", "label": "Force ventilation provided at ≥ 1.4m³/min per person", "label_zh": "已提供强制通风，每人 ≥ 1.4m³/分钟", "required": true },
        { "id": "rescue_equipment_tested", "type": "yes_no", "label": "Rescue equipment tested", "label_zh": "救援设备已测试", "required": true },
        { "id": "electrical_tools_approved", "type": "yes_no", "label": "Electrical tools of flame proof and approved type", "label_zh": "电动工具为防爆及认可类型", "required": true },
        { "id": "exhaust_directed_away", "type": "yes_no", "label": "Exhaust from internal combustion engines directed away by a qualified person", "label_zh": "内燃机废气由合格人员引导排出", "required": true },
        { "id": "work_platform_provided", "type": "yes_no", "label": "Work requiring work platform / ladders is accordingly provided", "label_zh": "需要工作平台／梯子的工作已相应提供", "required": true },
        { "id": "lockout_tagout", "type": "yes_no", "label": "Lock-out and tag-out procedure complied for maintenance works", "label_zh": "维修工作已遵守上锁挂牌程序", "required": true }
      ]
    },
    {
      "title": "Inspection by Confined Space Safety Assessor",
      "title_zh": "密闭空间安全评估员检查",
      "fields": [
        { "id": "assessor_name", "type": "text", "label": "Assessor name", "label_zh": "评估员姓名", "required": true },
        { "id": "assessor_date", "type": "date", "label": "Inspection date", "label_zh": "检查日期", "required": true },
        { "id": "assessor_result", "type": "select", "label": "Result", "label_zh": "结果", "required": true, "options": ["SAFE", "UNSAFE"], "options_zh": ["安全", "不安全"] }
      ]
    },
    {
      "title": "Inspection by Appointed Manhole Supervisor",
      "title_zh": "指定人孔监督员检查",
      "fields": [
        { "id": "supervisor_name", "type": "text", "label": "Manhole Supervisor name", "label_zh": "人孔监督员姓名", "required": true },
        { "id": "supervisor_date", "type": "date", "label": "Inspection date", "label_zh": "检查日期", "required": true },
        { "id": "supervisor_result", "type": "select", "label": "Result", "label_zh": "结果", "required": true, "options": ["ACCEPT", "REJECT"], "options_zh": ["接受", "拒绝"] }
      ]
    },
    {
      "title": "Safety Briefing",
      "title_zh": "安全简报",
      "description": "1. No smoking or naked flame in or near the confined space.\n2. Only approved lighting, electrical equipment and tools are used.\n3. Only approved respiratory protection equipment to be used.\n4. Continuous ventilation is necessary at all times.\n5. At least two workers must be engaged at any one time.\n6. A watchman must be stationed outside the entrance of the confined space.\n7. Gas testing must be carried out at intervals not exceeding 2 hours.\n8. All workers must leave the confined space when gas testing is being carried out.\n9. All workers must immediately leave the confined space if there is reason to suspect the atmosphere is unsafe.\n10. Safety harness and lifeline must be attached to every worker entering the confined space.\n11. Emergency rescue procedures must be followed in the event of an emergency.",
      "description_zh": "1. 密闭空间内或附近禁止吸烟或明火。\n2. 只能使用经认可的照明、电气设备和工具。\n3. 只能使用经认可的呼吸防护设备。\n4. 必须始终保持持续通风。\n5. 任何时候至少须有两名工人参与。\n6. 必须在密闭空间入口外派驻一名看守人。\n7. 气体检测须每隔不超过2小时进行一次。\n8. 进行气体检测时所有工人须离开密闭空间。\n9. 如有理由怀疑大气不安全，所有工人须立即离开密闭空间。\n10. 每位进入密闭空间的工人须佩戴安全带和救生索。\n11. 紧急情况下须遵循紧急救援程序。",
      "fields": [
        { "id": "briefing_acknowledged", "type": "yes_no", "label": "All workers have been briefed and acknowledge the above safety rules", "label_zh": "所有工人已听取并确认上述安全规则", "required": true },
        { "id": "briefing_conducted_by", "type": "text", "label": "Safety Briefing conducted by (Name of Assessor/Supervisor)", "label_zh": "安全简报由以下人员主持（评估员／监督员姓名）", "required": true }
      ]
    },
    {
      "title": "Site Photos",
      "title_zh": "现场照片",
      "fields": [
        { "id": "site_photo", "type": "photo", "label": "Confined space entry point photos", "label_zh": "密闭空间入口照片", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "entrant", "label": "Entrant Workers", "label_zh": "进入工人", "min": 2, "max": 7, "fields": ["name", "worker_id"] },
    { "role": "watchman", "label": "Watchman / Standby Person", "label_zh": "看守人／待命人员", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'
WHERE code = 'CS';

-- ============================================================
-- Excavation (EX) — OCP-10
-- ============================================================
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Safety Conditions",
      "title_zh": "安全条件",
      "fields": [
        { "id": "swp_briefed", "type": "yes_no", "label": "SWP briefed to workers involved?", "label_zh": "安全工作程序已向相关工人传达？", "required": true },
        { "id": "safety_rules_briefed", "type": "yes_no", "label": "In-house Safety Rules & Regulations briefed to workers?", "label_zh": "公司内部安全规章制度已向工人传达？", "required": true },
        { "id": "ppe_issued", "type": "yes_no", "label": "Has the required PPE issued to workers? (Safety Belt, Safety Harness, etc)", "label_zh": "是否已向工人发放所需个人防护装备？（安全带、安全吊带等）", "required": true },
        { "id": "excavation_sloped", "type": "yes_no", "label": "Excavation is sloped according to requirement", "label_zh": "挖掘工程已按要求设置坡度", "required": true },
        { "id": "no_material_near_edge", "type": "yes_no", "label": "No material or machinery shall be placed near excavation edge", "label_zh": "挖掘边缘附近不得放置材料或机械", "required": true },
        { "id": "earth_stockpile_compact", "type": "yes_no", "label": "Excess earth stockpile to be compact to prevent further soil erosion", "label_zh": "多余土方堆须压实以防止进一步水土流失", "required": true },
        { "id": "excavation_permit_approved", "type": "yes_no", "label": "Permit for excavation has been approved", "label_zh": "挖掘许可证已获批准", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Excavation site photos (max 5, required)", "label_zh": "挖掘现场照片（最多5张，必填）", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "label_zh": "工人", "min": 1, "max": 20, "fields": ["name", "trade"] },
    { "role": "operator", "label": "Equipment Operators", "label_zh": "设备操作员", "min": 0, "max": 5, "fields": ["name", "cert_number"] }
  ]
}'
WHERE code = 'EX';

-- ============================================================
-- Hot Works (HW) — OCP-05
-- ============================================================
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Safety Conditions",
      "title_zh": "安全条件",
      "fields": [
        { "id": "electrical_isolation", "type": "yes_no", "label": "Electrical isolation provided", "label_zh": "已提供电气隔离", "required": true },
        { "id": "equipment_isolated", "type": "yes_no", "label": "Equipment isolated", "label_zh": "设备已隔离", "required": true },
        { "id": "track_isolated", "type": "yes_no", "label": "Track isolated", "label_zh": "轨道已隔离", "required": true },
        { "id": "warning_signals", "type": "yes_no", "label": "Warning signals position", "label_zh": "警告信号已就位", "required": true },
        { "id": "lookout_man", "type": "yes_no", "label": "Lookout man available", "label_zh": "已安排瞭望人员", "required": true },
        { "id": "explosion_check", "type": "yes_no", "label": "Explosion check", "label_zh": "爆炸检查", "required": true },
        { "id": "toxic_check", "type": "yes_no", "label": "Toxic check", "label_zh": "毒性检查", "required": true },
        { "id": "area_clear_combustibles", "type": "yes_no", "label": "Area clear of combustibles", "label_zh": "区域内已清除可燃物", "required": true },
        { "id": "fire_watcher", "type": "yes_no", "label": "Fire watcher provided", "label_zh": "已安排火灾监视员", "required": true },
        { "id": "welding_flash_guard", "type": "yes_no", "label": "Welding flash guard required", "label_zh": "需要焊接防护挡板", "required": true },
        { "id": "life_line", "type": "yes_no", "label": "Life line provided with handler", "label_zh": "已提供救生索及操作人员", "required": true },
        { "id": "barriers", "type": "yes_no", "label": "Barriers provided", "label_zh": "已设置屏障", "required": true },
        { "id": "portable_lighting", "type": "yes_no", "label": "Portable lighting", "label_zh": "便携式照明", "required": true },
        { "id": "no_smoking", "type": "yes_no", "label": "No smoking or naked flame", "label_zh": "禁止吸烟或明火", "required": true },
        { "id": "scaffolding_access", "type": "yes_no", "label": "Scaffolding / work access provided", "label_zh": "已提供脚手架／工作通道", "required": true },
        { "id": "first_aid_kit", "type": "yes_no", "label": "First aid kit", "label_zh": "急救箱", "required": true },
        { "id": "fire_extinguisher", "type": "yes_no", "label": "Fire extinguisher", "label_zh": "灭火器", "required": true },
        { "id": "flashback_arrestor", "type": "yes_no", "label": "Flashback arrestor provided & in good condition", "label_zh": "已提供回火防止器且状况良好", "required": true },
        { "id": "cylinder_secured", "type": "yes_no", "label": "Cylinder in upright position & secured", "label_zh": "气瓶直立放置且已固定", "required": true },
        { "id": "hoses_condition", "type": "yes_no", "label": "Hoses in good condition", "label_zh": "软管状况良好", "required": true },
        { "id": "gas_regulators", "type": "yes_no", "label": "Gas regulators in good condition", "label_zh": "气体调节器状况良好", "required": true },
        { "id": "o_clips_secured", "type": "yes_no", "label": "O clips used to secure hoses", "label_zh": "已使用O型夹固定软管", "required": true },
        { "id": "equipment_leakage_check", "type": "yes_no", "label": "Equipment check for leakage", "label_zh": "设备泄漏检查", "required": true },
        { "id": "no_incompatible_works", "type": "yes_no", "label": "No incompatible works at surroundings", "label_zh": "周围无不相容作业", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Hot works site photos (max 5, required)", "label_zh": "热工作业现场照片（最多5张，必填）", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Hot Work Operators", "label_zh": "热工作业操作员", "min": 1, "max": 10, "fields": ["name", "trade", "cert_number"] },
    { "role": "fire_watch", "label": "Fire Watch Person", "label_zh": "火灾监视员", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'
WHERE code = 'HW';

-- ============================================================
-- Lifting Work (LW) — OCP-12
-- ============================================================
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Safety Conditions",
      "title_zh": "安全条件",
      "fields": [
        { "id": "valid_lm_cert", "type": "yes_no", "label": "Valid LM certificate for crane", "label_zh": "起重机有效LM证书", "required": true },
        { "id": "valid_maintenance_report", "type": "yes_no", "label": "Valid periodic maintenance report", "label_zh": "有效的定期维修报告", "required": true },
        { "id": "operator_daily_check", "type": "yes_no", "label": "Crane operator''s daily check completed", "label_zh": "起重机操作员每日检查已完成", "required": true },
        { "id": "supervisor_daily_check", "type": "yes_no", "label": "Lifting supervisor''s daily check completed", "label_zh": "吊装监督员每日检查已完成", "required": true },
        { "id": "crane_firm_ground", "type": "yes_no", "label": "Crane has been set up on firm ground with its access being in accordance with PE design", "label_zh": "起重机已在坚固地面上安装，其通道符合PE设计", "required": true },
        { "id": "safe_distance_excavation", "type": "yes_no", "label": "Crane is at a safe distance from excavations / trenches", "label_zh": "起重机与挖掘／沟渠保持安全距离", "required": true },
        { "id": "lifting_gears_condition", "type": "yes_no", "label": "Lifting gears are in good condition with number tags, and traceable to valid LG certificates", "label_zh": "吊具状况良好，有编号牌，可追溯至有效LG证书", "required": true },
        { "id": "warning_signs_barriers", "type": "yes_no", "label": "Warning signs and barriers provided within hoisting radius", "label_zh": "起吊半径内已设置警告标志和屏障", "required": true },
        { "id": "others", "type": "text", "label": "Others", "label_zh": "其他", "required": false }
      ]
    },
    {
      "title": "Crane Certificate",
      "title_zh": "起重机证书",
      "fields": [
        { "id": "crane_lm_no", "type": "text", "label": "Crane LM No.", "label_zh": "起重机LM编号", "required": true },
        { "id": "crane_lm_expiry", "type": "date", "label": "Crane LM Expiry Date", "label_zh": "起重机LM到期日", "required": true }
      ]
    },
    {
      "title": "Site Photos",
      "title_zh": "现场照片",
      "fields": [
        { "id": "site_photo", "type": "photo", "label": "Lifting operation site photos (max 5, required)", "label_zh": "吊装作业现场照片（最多5张，必填）", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "crane_operator", "label": "Crane Operator", "label_zh": "起重机操作员", "min": 1, "max": 2, "fields": ["name"] },
    { "role": "rigger", "label": "Rigger", "label_zh": "索具工", "min": 1, "max": 4, "fields": ["name"] },
    { "role": "signalman", "label": "Signalman", "label_zh": "信号员", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'
WHERE code = 'LW';

-- ============================================================
-- Piling Work (PW) — OCP-16
-- ============================================================
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Safety Conditions",
      "title_zh": "安全条件",
      "fields": [
        { "id": "swp_briefed", "type": "yes_no", "label": "SWP briefed to workers involved?", "label_zh": "安全工作程序已向相关工人传达？", "required": true },
        { "id": "safety_rules_briefed", "type": "yes_no", "label": "In-house Safety Rules & Regulations briefed to workers?", "label_zh": "公司内部安全规章制度已向工人传达？", "required": true },
        { "id": "ppe_issued", "type": "yes_no", "label": "Has the required PPE issued to workers?", "label_zh": "是否已向工人发放所需个人防护装备？", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Piling work site photos (max 5, required)", "label_zh": "打桩工作现场照片（最多5张，必填）", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "label_zh": "工人", "min": 1, "max": 20, "fields": ["name"] }
  ]
}'
WHERE code = 'PW';
