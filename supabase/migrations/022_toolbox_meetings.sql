-- Toolbox meetings: daily safety briefings per project
create table toolbox_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid not null references projects(id) on delete cascade,
  conducted_by uuid not null references user_profiles(id),
  meeting_date date not null,
  meeting_time time,
  location text,
  checklist jsonb not null default '{}'::jsonb,
  attendance jsonb not null default '[]'::jsonb,
  notes text,
  signed_off boolean not null default false,
  signed_off_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active meeting per project per day
create unique index idx_toolbox_meetings_project_date
  on toolbox_meetings (project_id, meeting_date)
  where is_active = true;

create index idx_toolbox_meetings_project on toolbox_meetings (project_id);
create index idx_toolbox_meetings_conducted_by on toolbox_meetings (conducted_by);

-- RLS
alter table toolbox_meetings enable row level security;

-- SELECT: org members can view
create policy "toolbox_meetings_select" on toolbox_meetings
  for select using (
    organization_id = (select organization_id from user_profiles where id = auth.uid())
  );

-- INSERT: org members can create
create policy "toolbox_meetings_insert" on toolbox_meetings
  for insert with check (
    organization_id = (select organization_id from user_profiles where id = auth.uid())
  );

-- UPDATE: conductor or admin can update
create policy "toolbox_meetings_update" on toolbox_meetings
  for update using (
    conducted_by = auth.uid()
    or (select is_admin from user_profiles where id = auth.uid()) = true
  );
