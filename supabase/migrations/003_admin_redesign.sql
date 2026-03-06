-- Migration: Admin Redesign
-- Move admin from project-level role to org-level flag on user_profiles.
-- Add soft-disable (is_active) on user_project_roles.

-- 1. Add is_admin to user_profiles
ALTER TABLE user_profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- 2. Migrate existing admin role assignments to is_admin flag
UPDATE user_profiles SET is_admin = true
WHERE id IN (SELECT DISTINCT user_id FROM user_project_roles WHERE role = 'admin');

-- 3. Remove admin role entries from user_project_roles
DELETE FROM user_project_roles WHERE role = 'admin';

-- 4. Update role check constraint to remove 'admin'
ALTER TABLE user_project_roles
  DROP CONSTRAINT user_project_roles_role_check,
  ADD CONSTRAINT user_project_roles_role_check
    CHECK (role IN ('applicant', 'verifier', 'approver'));

-- 5. Add is_active to user_project_roles for soft-disable
ALTER TABLE user_project_roles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
