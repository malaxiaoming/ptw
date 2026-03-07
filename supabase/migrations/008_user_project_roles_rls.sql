-- Allow authenticated users to read their own project role assignments.
-- This is required for getUserRolesForProject() which uses the authenticated
-- Supabase client (RLS applies).
CREATE POLICY "Users can read own project roles"
  ON user_project_roles FOR SELECT
  USING (user_id = auth.uid());
