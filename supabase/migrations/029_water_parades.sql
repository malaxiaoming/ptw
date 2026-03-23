-- Water parades: periodic hydration checks with photo evidence per project

-- Main entry table
create table water_parades (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid not null references projects(id) on delete cascade,
  created_by uuid not null references user_profiles(id),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_water_parades_project on water_parades (project_id);

-- Photos attached to a water parade entry
create table water_parade_photos (
  id uuid primary key default gen_random_uuid(),
  water_parade_id uuid not null references water_parades(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text not null,
  file_size integer not null default 0,
  uploaded_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now()
);

create index idx_water_parade_photos_parade on water_parade_photos (water_parade_id);

-- Workers present at a water parade
create table water_parade_workers (
  id uuid primary key default gen_random_uuid(),
  water_parade_id uuid not null references water_parades(id) on delete cascade,
  worker_id uuid references workers(id),
  worker_name text not null,
  created_at timestamptz not null default now()
);

create index idx_water_parade_workers_parade on water_parade_workers (water_parade_id);

-- RLS
alter table water_parades enable row level security;
alter table water_parade_photos enable row level security;
alter table water_parade_workers enable row level security;

-- water_parades policies
create policy "water_parades_select" on water_parades
  for select using (
    organization_id = (select organization_id from user_profiles where id = auth.uid())
  );

create policy "water_parades_insert" on water_parades
  for insert with check (
    organization_id = (select organization_id from user_profiles where id = auth.uid())
  );

create policy "water_parades_update" on water_parades
  for update using (
    created_by = auth.uid()
    or (select is_admin from user_profiles where id = auth.uid()) = true
  );

-- water_parade_photos policies (access via parent)
create policy "water_parade_photos_select" on water_parade_photos
  for select using (
    exists (
      select 1 from water_parades wp
      where wp.id = water_parade_id
      and wp.organization_id = (select organization_id from user_profiles where id = auth.uid())
    )
  );

create policy "water_parade_photos_insert" on water_parade_photos
  for insert with check (
    exists (
      select 1 from water_parades wp
      where wp.id = water_parade_id
      and wp.organization_id = (select organization_id from user_profiles where id = auth.uid())
    )
  );

-- water_parade_workers policies (access via parent)
create policy "water_parade_workers_select" on water_parade_workers
  for select using (
    exists (
      select 1 from water_parades wp
      where wp.id = water_parade_id
      and wp.organization_id = (select organization_id from user_profiles where id = auth.uid())
    )
  );

create policy "water_parade_workers_insert" on water_parade_workers
  for insert with check (
    exists (
      select 1 from water_parades wp
      where wp.id = water_parade_id
      and wp.organization_id = (select organization_id from user_profiles where id = auth.uid())
    )
  );

-- Storage bucket for water parade photos (private)
insert into storage.buckets (id, name, public)
values ('water-parade-photos', 'water-parade-photos', false)
on conflict (id) do nothing;
