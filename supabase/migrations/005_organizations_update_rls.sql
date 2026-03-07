-- Allow org admins to update their own organization
create policy "Admins can update own organization"
  on organizations for update
  using (
    id in (
      select organization_id from user_profiles where id = auth.uid() and is_admin = true
    )
  )
  with check (
    id in (
      select organization_id from user_profiles where id = auth.uid() and is_admin = true
    )
  );
