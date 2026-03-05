# PTW Deployment Guide

## Checklist

```
[ ] Step 1: Supabase project created
[ ] Step 2: SQL migrations run (001_initial_schema.sql, 002_rls_policies.sql, seed.sql)
[ ] Step 3: Auth configured (email provider + Site URL + Redirect URLs)
[ ] Step 4: Storage bucket "permit-attachments" created (private)
[ ] Step 5: First admin user bootstrapped via SQL
[ ] Step 6: Deployed to Vercel with env vars set
[ ] Step 7: Cron job enabled
```

---

## Step 1: Create a Supabase Project

Go to https://supabase.com → New Project.

**Info you'll get from Supabase:**
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (looks like `https://xxxx.supabase.co`)
- **Anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
- **Service role key** → `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → keep this secret)

---

## Step 2: Run Database Migrations

In the Supabase dashboard → **SQL Editor**, run these files in order:

1. `supabase/migrations/001_initial_schema.sql` — creates all tables
2. `supabase/migrations/002_rls_policies.sql` — enables RLS
3. `supabase/seed.sql` — inserts the 7 default permit types

---

## Step 3: Configure Supabase Auth

In Supabase dashboard → **Authentication → Providers**:
- Enable **Email** provider
- Set **Site URL** to your Vercel domain (e.g. `https://ptw.yourdomain.com`)
- Add the same URL to **Redirect URLs**

For production email (user invites), configure custom SMTP under **Authentication → SMTP Settings**.
Supabase free tier is limited to 4 emails/hour.

---

## Step 4: Create the Storage Bucket

In Supabase dashboard → **Storage**:
- Create a bucket named exactly: `permit-attachments`
- Set it to **private** (not public)

---

## Step 5: Bootstrap the First Admin User

1. In Supabase → **Authentication → Users** → **Invite user** (enter your email)
2. Click the link in your email, set a password
3. In **SQL Editor**, run:

```sql
-- Replace with your actual user UUID (shown in Auth → Users)
insert into user_profiles (id, email, name, organization_id)
values (
  '<your-auth-user-id>',
  '<your-email>',
  '<your-name>',
  '00000000-0000-0000-0000-000000000001'
);

insert into projects (organization_id, name, location)
values ('00000000-0000-0000-0000-000000000001', 'My First Project', 'Singapore');

insert into user_project_roles (user_id, project_id, role)
values (
  '<your-auth-user-id>',
  (select id from projects where name = 'My First Project'),
  'admin'
);
```

---

## Step 6: Deploy to Vercel

1. Push the repo to GitHub
2. Go to https://vercel.com → New Project → import your repo
3. Add these **Environment Variables**:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `CRON_SECRET` | Any random string — run: `openssl rand -hex 32` |
| `RESEND_API_KEY` | Not wired up yet — leave blank |

4. Deploy.

---

## Step 7: Enable the Cron Job

The `vercel.json` configures a daily cron at 08:00 UTC (`0 8 * * *`).

- **Vercel Pro** — runs automatically
- **Vercel Hobby (free)** — use an external service (e.g. https://cron-job.org) to POST to:
  `https://yourapp.vercel.app/api/cron/expiry-check`
  with header: `Authorization: Bearer <your-CRON_SECRET>`
