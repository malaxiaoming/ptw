-- Enable RLS on all tables
alter table organizations enable row level security;
alter table projects enable row level security;
alter table user_profiles enable row level security;
alter table user_project_roles enable row level security;
alter table permit_types enable row level security;
alter table permits enable row level security;
alter table permit_attachments enable row level security;
alter table permit_activity_log enable row level security;
alter table workers enable row level security;
alter table notifications enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on user_profiles for select
  using (auth.uid() = id);

-- Users can read profiles in their org
create policy "Users can read org profiles"
  on user_profiles for select
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- Users can read projects they are assigned to
create policy "Users can read assigned projects"
  on projects for select
  using (
    id in (
      select project_id from user_project_roles where user_id = auth.uid()
    )
  );

-- Users can read permits in their projects
create policy "Users can read project permits"
  on permits for select
  using (
    project_id in (
      select project_id from user_project_roles where user_id = auth.uid()
    )
  );

-- Users can read their own notifications
create policy "Users can read own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on notifications for update
  using (user_id = auth.uid());

-- Workers visible within org
create policy "Users can read org workers"
  on workers for select
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- Permit types visible within org
create policy "Users can read org permit types"
  on permit_types for select
  using (
    organization_id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );

-- Activity log readable for accessible permits
create policy "Users can read permit activity"
  on permit_activity_log for select
  using (
    permit_id in (
      select id from permits where project_id in (
        select project_id from user_project_roles where user_id = auth.uid()
      )
    )
  );

-- Attachments readable for accessible permits
create policy "Users can read permit attachments"
  on permit_attachments for select
  using (
    permit_id in (
      select id from permits where project_id in (
        select project_id from user_project_roles where user_id = auth.uid()
      )
    )
  );

-- Service role bypasses RLS for server-side API routes
-- (This is default Supabase behavior for service_role key)
