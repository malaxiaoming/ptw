ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
