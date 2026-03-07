-- Add new columns (IF NOT EXISTS prevents errors on re-run)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS reference_number text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS postal_code text;

-- Copy existing location data into address (only if location column still exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'location') THEN
    UPDATE projects SET address = location WHERE location IS NOT NULL AND address IS NULL;
    ALTER TABLE projects DROP COLUMN location;
  END IF;
END $$;
