-- SIC Auto-Generation, Remove Cert Expiry, Enforce SIC on Permits
-- 1. Add project-level SIC settings
-- 2. Drop sic_expiry from worker_sic_records
-- 3. Drop cert_number, cert_expiry from workers
-- 4. Create generate_next_sic_number() function
-- 5. Backfill existing workers with SIC records

-- ============================================================
-- 1. Project-level SIC settings
-- ============================================================

alter table projects add column sic_number_prefix text not null default 'SIC-';
alter table projects add column sic_number_next integer not null default 1;

-- ============================================================
-- 2. Drop sic_expiry from worker_sic_records
-- ============================================================

alter table worker_sic_records drop column if exists sic_expiry;

-- ============================================================
-- 3. Drop cert_number, cert_expiry from workers
-- ============================================================

alter table workers drop column if exists cert_number;
alter table workers drop column if exists cert_expiry;

-- ============================================================
-- 4. Atomic SIC number generation function
-- ============================================================

create or replace function generate_next_sic_number(p_project_id uuid)
returns text
language plpgsql
as $$
declare
  v_prefix text;
  v_next integer;
  v_sic_number text;
begin
  -- Atomically increment and get the current value
  update projects
  set sic_number_next = sic_number_next + 1
  where id = p_project_id
  returning sic_number_prefix, sic_number_next - 1 into v_prefix, v_next;

  if not found then
    raise exception 'Project not found: %', p_project_id;
  end if;

  -- Pad to 4 digits minimum
  v_sic_number := v_prefix || lpad(v_next::text, 4, '0');
  return v_sic_number;
end;
$$;

-- ============================================================
-- 5. Backfill: insert SIC records for workers that don't have one
-- ============================================================

insert into worker_sic_records (worker_id, project_id, sic_number, organization_id)
select
  sub.worker_id,
  sub.project_id,
  (select generate_next_sic_number(sub.project_id)),
  sub.organization_id
from (
  select id as worker_id, project_id, organization_id
  from workers
  where project_id is not null
    and is_active = true
    and id not in (
      select worker_id from worker_sic_records
    )
) sub;
