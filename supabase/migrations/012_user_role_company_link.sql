-- Add company_id to user_project_roles to link users to their company within a project
ALTER TABLE user_project_roles
  ADD COLUMN company_id uuid REFERENCES project_companies(id) ON DELETE SET NULL;

CREATE INDEX idx_upr_company ON user_project_roles(company_id);
