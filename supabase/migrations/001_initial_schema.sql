-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Organizations
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Projects
create table projects (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  name text not null,
  location text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index idx_projects_org on projects(organization_id);

-- Users (extends Supabase auth.users)
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  phone text,
  name text not null,
  organization_id uuid references organizations(id),
  created_at timestamptz not null default now()
);

-- User-Project-Role assignments
create table user_project_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  role text not null check (role in ('applicant', 'verifier', 'approver', 'admin')),
  created_at timestamptz not null default now(),
  unique (user_id, project_id, role)
);

create index idx_upr_user on user_project_roles(user_id);
create index idx_upr_project on user_project_roles(project_id);

-- Permit types
create table permit_types (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  name text not null,
  code text not null,
  checklist_template jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

-- Permits
create table permits (
  id uuid primary key default uuid_generate_v4(),
  permit_number text not null unique,
  project_id uuid not null references projects(id),
  permit_type_id uuid not null references permit_types(id),
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'verified', 'approved', 'active', 'closure_submitted', 'closed', 'rejected', 'revoked')
  ),
  applicant_id uuid not null references user_profiles(id),
  verifier_id uuid references user_profiles(id),
  approver_id uuid references user_profiles(id),
  work_location text,
  work_description text,
  gps_lat double precision,
  gps_lng double precision,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  checklist_data jsonb not null default '{}',
  personnel jsonb not null default '[]',
  rejection_reason text,
  revocation_reason text,
  submitted_at timestamptz,
  verified_at timestamptz,
  approved_at timestamptz,
  activated_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_permits_project on permits(project_id);
create index idx_permits_status on permits(status);
create index idx_permits_applicant on permits(applicant_id);
create index idx_permits_number on permits(permit_number);
create index idx_permits_scheduled_end on permits(scheduled_end);

-- Permit attachments
create table permit_attachments (
  id uuid primary key default uuid_generate_v4(),
  permit_id uuid not null references permits(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  uploaded_by uuid not null references user_profiles(id),
  created_at timestamptz not null default now()
);

create index idx_attachments_permit on permit_attachments(permit_id);

-- Permit activity log (audit trail)
create table permit_activity_log (
  id uuid primary key default uuid_generate_v4(),
  permit_id uuid not null references permits(id) on delete cascade,
  action text not null check (
    action in ('created', 'submitted', 'returned', 'verified', 'approved', 'rejected', 'activated', 'revoked', 'closure_submitted', 'closure_returned', 'closed')
  ),
  performed_by uuid not null references user_profiles(id),
  comments text,
  created_at timestamptz not null default now()
);

create index idx_activity_permit on permit_activity_log(permit_id);
create index idx_activity_created on permit_activity_log(created_at);

-- Workers registry
create table workers (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  name text not null,
  phone text,
  company text,
  trade text,
  cert_number text,
  cert_expiry date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_workers_org on workers(organization_id);

-- Notifications
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  permit_id uuid references permits(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id);
create index idx_notifications_unread on notifications(user_id, is_read) where is_read = false;

-- Auto-update updated_at on permits
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger permits_updated_at
  before update on permits
  for each row execute function update_updated_at();

-- Permit number sequence
create sequence permit_number_seq start 1;

create or replace function generate_permit_number()
returns trigger as $$
begin
  new.permit_number = 'PTW-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('permit_number_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger permits_number_gen
  before insert on permits
  for each row
  when (new.permit_number is null)
  execute function generate_permit_number();
