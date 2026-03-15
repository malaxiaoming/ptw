-- Worker Registration Enhancement: NRIC/FIN encryption, SIC tracking, audit logging
-- Deliverable 1: SIC table + NRIC encryption + audit log

-- ============================================================
-- 1. Workers table — new columns for NRIC/FIN
-- ============================================================

alter table workers add column nric_fin_type text check (nric_fin_type in ('nric', 'fin', 'work_permit'));
alter table workers add column nric_fin_last4 text;
alter table workers add column nric_fin_encrypted text;
alter table workers add column consent_given boolean not null default false;
alter table workers add column consent_at timestamptz;

-- ============================================================
-- 2. Worker SIC Records — one per worker per project
-- ============================================================

create table worker_sic_records (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  sic_number text not null,
  sic_expiry date,
  sic_issuer text,
  issued_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  organization_id uuid not null references organizations(id)
);

-- One active SIC per worker per project
alter table worker_sic_records add constraint worker_sic_unique_worker_project unique (worker_id, project_id);

create index idx_worker_sic_worker_id on worker_sic_records(worker_id);
create index idx_worker_sic_project_id on worker_sic_records(project_id);

-- RLS
alter table worker_sic_records enable row level security;

create policy "Users can view SIC records in their org"
  on worker_sic_records for select
  to authenticated
  using (organization_id = (select organization_id from user_profiles where id = auth.uid()));

create policy "Admins can insert SIC records"
  on worker_sic_records for insert
  to authenticated
  with check (
    organization_id = (select organization_id from user_profiles where id = auth.uid())
    and (select is_admin from user_profiles where id = auth.uid()) = true
  );

create policy "Admins can update SIC records"
  on worker_sic_records for update
  to authenticated
  using (
    organization_id = (select organization_id from user_profiles where id = auth.uid())
    and (select is_admin from user_profiles where id = auth.uid()) = true
  );

-- ============================================================
-- 3. Sensitive Data Access Log — audit trail for NRIC access
-- ============================================================

create table sensitive_data_access_log (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  accessed_by uuid not null references auth.users(id),
  access_type text not null,
  reason text not null,
  ip_address text,
  created_at timestamptz not null default now(),
  organization_id uuid not null references organizations(id)
);

create index idx_sensitive_log_worker_id on sensitive_data_access_log(worker_id);
create index idx_sensitive_log_accessed_by on sensitive_data_access_log(accessed_by);

-- RLS
alter table sensitive_data_access_log enable row level security;

-- Authenticated users can insert audit log entries for their org
create policy "Users can insert audit log entries"
  on sensitive_data_access_log for insert
  to authenticated
  with check (organization_id = (select organization_id from user_profiles where id = auth.uid()));

-- Only admins can view audit logs
create policy "Admins can view audit logs"
  on sensitive_data_access_log for select
  to authenticated
  using (
    organization_id = (select organization_id from user_profiles where id = auth.uid())
    and (select is_admin from user_profiles where id = auth.uid()) = true
  );
