-- Add bilingual (Chinese) labels to WAH and DM permit type checklist templates

-- ============================================================
-- Work at Height (WAH)
-- ============================================================
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Pre-Work Safety Checks",
      "title_zh": "工作前安全检查",
      "fields": [
        { "id": "swp_briefed", "type": "yes_no", "label": "SWP briefed to workers involved?", "label_zh": "安全工作程序已向相关工人传达？", "required": true },
        { "id": "safety_rules_briefed", "type": "yes_no", "label": "In-house Safety Rules and Regulations briefed to workers?", "label_zh": "公司内部安全规章制度已向工人传达？", "required": true },
        { "id": "ppe_issued", "type": "yes_no", "label": "Has the required PPE issued to workers? (Safety Belt, Safety Harness, etc)", "label_zh": "是否已向工人发放所需个人防护装备？（安全带、安全吊带等）", "required": true },
        { "id": "harness_liftline", "type": "yes_no", "label": "Ensure when there is potential falling hazard, safety harness and additional lift line were provided.", "label_zh": "确保存在坠落危险时，已提供安全吊带和附加救生索。", "required": true },
        { "id": "liftline_secured", "type": "yes_no", "label": "Lift line was firmly secured to rigid structure when necessary.", "label_zh": "救生索在必要时已牢固固定于刚性结构上。", "required": true },
        { "id": "hook_briefed", "type": "yes_no", "label": "Workers were briefed to hook their safety belt or harness to secured point (life line, structure, etc)", "label_zh": "工人已被告知将安全带或吊带扣在固定点上（救生索、结构等）", "required": true },
        { "id": "area_barricaded", "type": "yes_no", "label": "Work area below to be barricade with danger signboard to prevent entry.", "label_zh": "下方工作区域已设置围栏和危险告示牌以防止进入。", "required": true },
        { "id": "harness_condition", "type": "yes_no", "label": "Check to ensure safety belt or harness is not defective.", "label_zh": "检查确保安全带或吊带无缺陷。", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Site condition photos", "label_zh": "现场状况照片", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "label_zh": "工人", "min": 1, "max": 20, "fields": ["name", "trade", "cert_number"] }
  ]
}'
WHERE code = 'WAH';

-- ============================================================
-- Demolition (DM)
-- ============================================================
UPDATE permit_types
SET checklist_template = '{
  "sections": [
    {
      "title": "Demolition Safety Checks",
      "title_zh": "拆除工程安全检查",
      "fields": [
        { "id": "hoarding_barricade", "type": "yes_no", "label": "Erect hoarding, adequate barricade and warning signage are provided to prevent unauthorised entry", "label_zh": "已设置围挡、充足的围栏和警告标志以防止未经授权进入", "required": true },
        { "id": "ppe_used", "type": "yes_no", "label": "Appropriate personal protection equipment are used", "label_zh": "已使用适当的个人防护装备", "required": true },
        { "id": "service_lines_capped", "type": "yes_no", "label": "Disconnect and cap all the service lines", "label_zh": "断开并封堵所有管线", "required": true },
        { "id": "glass_loose_removed", "type": "yes_no", "label": "Dismantle all glass in the exterior openings, and loose components before commencement of demolition works", "label_zh": "在拆除工程开始前，拆除外部开口处所有玻璃及松动部件", "required": true },
        { "id": "hazardous_material_check", "type": "yes_no", "label": "Check and ensure adequate precaution measures has been taken if there is presence of material such as asbestos, lead or mercury", "label_zh": "检查并确保如有石棉、铅或汞等材料，已采取充分的预防措施", "required": true },
        { "id": "structure_guarded", "type": "yes_no", "label": "All structure must be guarded to prevent falling or collapse", "label_zh": "所有结构须加以防护以防坠落或倒塌", "required": true },
        { "id": "safe_access_exit", "type": "yes_no", "label": "Safe access and exit route to/from any building are provided", "label_zh": "已提供通往／离开任何建筑物的安全通道和出口路线", "required": true },
        { "id": "demolition_permit_display", "type": "yes_no", "label": "Prominent display of demolition permit", "label_zh": "拆除许可证已醒目展示", "required": true },
        { "id": "debris_disposal", "type": "yes_no", "label": "Proper material disposal of debris are provided", "label_zh": "已提供适当的废料处理", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Pre-demolition photos", "label_zh": "拆除前照片", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Demolition Workers", "label_zh": "拆除工人", "min": 1, "max": 20, "fields": ["name", "trade"] },
    { "role": "operator", "label": "Equipment Operators", "label_zh": "设备操作员", "min": 0, "max": 5, "fields": ["name", "cert_number"] }
  ]
}'
WHERE code = 'DM';
