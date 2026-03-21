-- Add signature columns for applicant, verifier, and approver
-- Stores base64 data URIs (~5-20KB each)
ALTER TABLE permits
  ADD COLUMN applicant_signature text,
  ADD COLUMN verifier_signature text,
  ADD COLUMN approver_signature text;
