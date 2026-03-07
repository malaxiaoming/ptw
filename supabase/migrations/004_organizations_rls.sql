-- Allow authenticated users to read their own organization
create policy "Users can read own organization"
  on organizations for select
  using (
    id in (
      select organization_id from user_profiles where id = auth.uid()
    )
  );
