-- Project companies table
create table project_companies (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  role text not null default 'subcontractor'
    check (role in ('main_contractor', 'subcontractor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);
create index idx_project_companies_project on project_companies(project_id);

-- Link workers to project and company
alter table workers add column project_id uuid references projects(id) on delete set null;
alter table workers add column company_id uuid references project_companies(id) on delete set null;
create index idx_workers_project on workers(project_id);
create index idx_workers_company on workers(company_id);
