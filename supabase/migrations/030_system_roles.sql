-- Add system-level admin roles (super_admin, regional_admin)
-- NULL = regular user (may still be org admin via is_admin)

ALTER TABLE user_profiles
  ADD COLUMN system_role text
  CHECK (system_role IN ('super_admin', 'regional_admin'));

-- Seed the super admin
UPDATE user_profiles SET system_role = 'super_admin'
  WHERE email = 'malaxiaoming@gmail.com';

-- Partial index for quick admin lookups
CREATE INDEX idx_user_profiles_system_role
  ON user_profiles(system_role) WHERE system_role IS NOT NULL;
