# PTW System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a MOM-compliant electronic Permit-To-Work system for Singapore construction sites with full lifecycle management.

**Architecture:** Next.js full-stack app with Supabase (PostgreSQL + Auth + Storage). Hardcoded state machine for permit workflow. JSONB for flexible checklist templates and responses. Server-side API routes for all business logic, RLS as safety net.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Supabase (PostgreSQL, Auth, Storage), Tailwind CSS, Resend (email), Vitest (testing)

**Design Doc:** `docs/plans/2026-03-04-ptw-system-design.md`
**MOM Reference:** `docs/references/mom-eptw-annex-b-spec.md`

---

## Phase 1: Project Scaffolding + Database + Auth

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- Create: `.env.local.example`
- Create: `.gitignore`

**Step 1: Scaffold the project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Step 2: Install core dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 3: Create environment template**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-key
```

**Step 4: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

**Step 5: Verify setup**

Run: `npm run dev`
Expected: Next.js dev server starts on localhost:3000

Run: `npx vitest run`
Expected: No tests found (passes with 0 tests)

**Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with TypeScript, Tailwind, Vitest"
```

---

### Task 2: Set Up Supabase Project + Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts`

**Step 1: Install Supabase CLI and initialize**

Run:
```bash
npm install -D supabase
npx supabase init
```

**Step 2: Write the initial migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
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
```

**Step 3: Create Supabase client utilities**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  )
}

export async function createServiceRoleClient() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

**Step 4: Verify migration syntax**

Run: `npx supabase db lint`
Expected: No errors

**Step 5: Commit**

```bash
git add supabase/ src/lib/supabase/
git commit -m "feat: add database schema and Supabase client utilities"
```

---

### Task 3: Authentication — Login Page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/middleware.ts`
- Create: `src/app/layout.tsx` (modify from scaffold)
- Test: `src/__tests__/login.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/login.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoginPage from '@/app/login/page'

describe('LoginPage', () => {
  it('renders email/phone input and password input', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email or phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders a sign in button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    render(<LoginPage />)
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/login.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement login page**

Create `src/app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { login } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Permit-To-Work System</h1>
        <form action={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
              Email or Phone Number
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com or +65XXXXXXXX"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="mt-4 text-center">
            <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Create `src/app/login/actions.ts`:
```typescript
'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  const supabase = await createServerSupabaseClient()

  // Determine if identifier is email or phone
  const isPhone = identifier.startsWith('+')
  const credentials = isPhone
    ? { phone: identifier, password }
    : { email: identifier, password }

  const { error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
```

**Step 4: Create auth middleware**

Create `src/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
}
```

**Step 5: Run tests**

Run: `npx vitest run src/__tests__/login.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/login/ src/middleware.ts src/__tests__/login.test.tsx
git commit -m "feat: add login page with email/phone auth and route protection"
```

---

### Task 4: Auth Middleware — Protect Routes + User Context

**Files:**
- Create: `src/lib/auth/get-user.ts`
- Create: `src/lib/auth/get-user-roles.ts`
- Test: `src/__tests__/lib/auth.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/lib/auth.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { canPerformAction, ROLE_PERMISSIONS } from '@/lib/auth/permissions'

describe('permissions', () => {
  it('allows applicant to create permit', () => {
    expect(canPerformAction('applicant', 'create_permit')).toBe(true)
  })

  it('denies verifier from creating permit', () => {
    expect(canPerformAction('verifier', 'create_permit')).toBe(false)
  })

  it('allows verifier to verify permit', () => {
    expect(canPerformAction('verifier', 'verify_permit')).toBe(true)
  })

  it('allows approver to approve permit', () => {
    expect(canPerformAction('approver', 'approve_permit')).toBe(true)
  })

  it('allows approver to revoke permit', () => {
    expect(canPerformAction('approver', 'revoke_permit')).toBe(true)
  })

  it('denies applicant from approving permit', () => {
    expect(canPerformAction('applicant', 'approve_permit')).toBe(false)
  })

  it('allows admin to manage users', () => {
    expect(canPerformAction('admin', 'manage_users')).toBe(true)
  })

  it('denies verifier from managing users', () => {
    expect(canPerformAction('verifier', 'manage_users')).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/auth.test.ts`
Expected: FAIL — module not found

**Step 3: Implement permissions**

Create `src/lib/auth/permissions.ts`:
```typescript
export type Role = 'applicant' | 'verifier' | 'approver' | 'admin'

export type Action =
  | 'create_permit'
  | 'edit_permit'
  | 'submit_permit'
  | 'verify_permit'
  | 'return_permit'
  | 'approve_permit'
  | 'reject_permit'
  | 'revoke_permit'
  | 'submit_closure'
  | 'verify_closure'
  | 'return_closure'
  | 'view_permits'
  | 'manage_users'
  | 'manage_projects'
  | 'manage_permit_types'
  | 'manage_workers'
  | 'view_dashboard'

export const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  applicant: [
    'create_permit',
    'edit_permit',
    'submit_permit',
    'submit_closure',
    'view_permits',
    'manage_workers',
    'view_dashboard',
  ],
  verifier: [
    'verify_permit',
    'return_permit',
    'verify_closure',
    'return_closure',
    'view_permits',
    'view_dashboard',
  ],
  approver: [
    'approve_permit',
    'reject_permit',
    'revoke_permit',
    'view_permits',
    'view_dashboard',
  ],
  admin: [
    'manage_users',
    'manage_projects',
    'manage_permit_types',
    'manage_workers',
    'view_permits',
    'view_dashboard',
  ],
}

export function canPerformAction(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false
}

export function canPerformActionWithRoles(roles: Role[], action: Action): boolean {
  return roles.some((role) => canPerformAction(role, action))
}
```

Create `src/lib/auth/get-user.ts`:
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
```

Create `src/lib/auth/get-user-roles.ts`:
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Role } from './permissions'

export async function getUserRolesForProject(
  userId: string,
  projectId: string
): Promise<Role[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('user_project_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('project_id', projectId)

  return (data ?? []).map((r) => r.role as Role)
}
```

**Step 4: Run tests**

Run: `npx vitest run src/__tests__/lib/auth.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/auth/ src/__tests__/lib/auth.test.ts
git commit -m "feat: add role-based permissions and user context utilities"
```

---

## Phase 2: Permit Workflow State Machine

### Task 5: Permit State Machine — Core Logic

**Files:**
- Create: `src/lib/permits/state-machine.ts`
- Test: `src/__tests__/lib/permits/state-machine.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/lib/permits/state-machine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  canTransition,
  getAvailableTransitions,
  type PermitStatus,
} from '@/lib/permits/state-machine'

describe('canTransition', () => {
  it('allows draft -> submitted', () => {
    expect(canTransition('draft', 'submit')).toBe(true)
  })

  it('allows submitted -> verified', () => {
    expect(canTransition('submitted', 'verify')).toBe(true)
  })

  it('allows submitted -> draft (return)', () => {
    expect(canTransition('submitted', 'return')).toBe(true)
  })

  it('allows verified -> approved', () => {
    expect(canTransition('verified', 'approve')).toBe(true)
  })

  it('allows verified -> rejected', () => {
    expect(canTransition('verified', 'reject')).toBe(true)
  })

  it('allows approved -> active', () => {
    expect(canTransition('approved', 'activate')).toBe(true)
  })

  it('allows active -> closure_submitted', () => {
    expect(canTransition('active', 'submit_closure')).toBe(true)
  })

  it('allows active -> revoked', () => {
    expect(canTransition('active', 'revoke')).toBe(true)
  })

  it('allows closure_submitted -> closed', () => {
    expect(canTransition('closure_submitted', 'verify_closure')).toBe(true)
  })

  it('allows closure_submitted -> active (return_closure)', () => {
    expect(canTransition('closure_submitted', 'return_closure')).toBe(true)
  })

  it('denies draft -> approved (skip)', () => {
    expect(canTransition('draft', 'approve')).toBe(false)
  })

  it('denies closed -> any transition', () => {
    expect(canTransition('closed', 'submit')).toBe(false)
    expect(canTransition('closed', 'revoke')).toBe(false)
  })

  it('denies rejected -> any transition', () => {
    expect(canTransition('rejected', 'approve')).toBe(false)
  })
})

describe('getAvailableTransitions', () => {
  it('returns submit for draft', () => {
    expect(getAvailableTransitions('draft')).toEqual(['submit'])
  })

  it('returns verify and return for submitted', () => {
    expect(getAvailableTransitions('submitted')).toEqual(['verify', 'return'])
  })

  it('returns approve and reject for verified', () => {
    expect(getAvailableTransitions('verified')).toEqual(['approve', 'reject'])
  })

  it('returns nothing for closed', () => {
    expect(getAvailableTransitions('closed')).toEqual([])
  })

  it('returns nothing for rejected', () => {
    expect(getAvailableTransitions('rejected')).toEqual([])
  })

  it('returns nothing for revoked', () => {
    expect(getAvailableTransitions('revoked')).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/permits/state-machine.test.ts`
Expected: FAIL — module not found

**Step 3: Implement state machine**

Create `src/lib/permits/state-machine.ts`:
```typescript
export type PermitStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'approved'
  | 'active'
  | 'closure_submitted'
  | 'closed'
  | 'rejected'
  | 'revoked'

export type PermitAction =
  | 'submit'
  | 'verify'
  | 'return'
  | 'approve'
  | 'reject'
  | 'activate'
  | 'submit_closure'
  | 'revoke'
  | 'verify_closure'
  | 'return_closure'

export type TransitionRequiredRole = 'applicant' | 'verifier' | 'approver' | 'system'

interface Transition {
  from: PermitStatus
  action: PermitAction
  to: PermitStatus
  role: TransitionRequiredRole
  requiresComment: boolean
}

export const TRANSITIONS: Transition[] = [
  { from: 'draft', action: 'submit', to: 'submitted', role: 'applicant', requiresComment: false },
  { from: 'submitted', action: 'verify', to: 'verified', role: 'verifier', requiresComment: false },
  { from: 'submitted', action: 'return', to: 'draft', role: 'verifier', requiresComment: true },
  { from: 'verified', action: 'approve', to: 'approved', role: 'approver', requiresComment: false },
  { from: 'verified', action: 'reject', to: 'rejected', role: 'approver', requiresComment: true },
  { from: 'approved', action: 'activate', to: 'active', role: 'system', requiresComment: false },
  { from: 'active', action: 'submit_closure', to: 'closure_submitted', role: 'applicant', requiresComment: false },
  { from: 'active', action: 'revoke', to: 'revoked', role: 'approver', requiresComment: true },
  { from: 'closure_submitted', action: 'verify_closure', to: 'closed', role: 'verifier', requiresComment: false },
  { from: 'closure_submitted', action: 'return_closure', to: 'active', role: 'verifier', requiresComment: true },
]

export function canTransition(from: PermitStatus, action: PermitAction): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.action === action)
}

export function getTransition(from: PermitStatus, action: PermitAction): Transition | undefined {
  return TRANSITIONS.find((t) => t.from === from && t.action === action)
}

export function getAvailableTransitions(status: PermitStatus): PermitAction[] {
  return TRANSITIONS.filter((t) => t.from === status).map((t) => t.action)
}
```

**Step 4: Run tests**

Run: `npx vitest run src/__tests__/lib/permits/state-machine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/permits/ src/__tests__/lib/permits/
git commit -m "feat: add permit workflow state machine with transition rules"
```

---

### Task 6: Permit Transition API — Execute Workflow Actions

**Files:**
- Create: `src/lib/permits/transition.ts`
- Test: `src/__tests__/lib/permits/transition.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/lib/permits/transition.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateTransition } from '@/lib/permits/transition'

describe('validateTransition', () => {
  const basePermit = {
    id: 'permit-1',
    status: 'draft' as const,
    applicant_id: 'user-1',
    project_id: 'project-1',
  }

  it('allows applicant to submit their own draft permit', () => {
    const result = validateTransition(basePermit, 'submit', {
      userId: 'user-1',
      roles: ['applicant'],
    })
    expect(result.valid).toBe(true)
  })

  it('denies verifier from submitting a permit', () => {
    const result = validateTransition(basePermit, 'submit', {
      userId: 'user-2',
      roles: ['verifier'],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('permission')
  })

  it('denies applicant from verifying their own permit', () => {
    const permit = { ...basePermit, status: 'submitted' as const }
    const result = validateTransition(permit, 'verify', {
      userId: 'user-1',
      roles: ['verifier'],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('own permit')
  })

  it('allows verifier to verify someone else permit', () => {
    const permit = { ...basePermit, status: 'submitted' as const }
    const result = validateTransition(permit, 'verify', {
      userId: 'user-2',
      roles: ['verifier'],
    })
    expect(result.valid).toBe(true)
  })

  it('denies invalid transition', () => {
    const result = validateTransition(basePermit, 'approve', {
      userId: 'user-3',
      roles: ['approver'],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Cannot')
  })

  it('requires comment when rejecting', () => {
    const permit = { ...basePermit, status: 'verified' as const }
    const result = validateTransition(permit, 'reject', {
      userId: 'user-3',
      roles: ['approver'],
    })
    expect(result.valid).toBe(true)
    expect(result.requiresComment).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/permits/transition.test.ts`
Expected: FAIL — module not found

**Step 3: Implement transition validation**

Create `src/lib/permits/transition.ts`:
```typescript
import { getTransition, canTransition, type PermitAction, type PermitStatus } from './state-machine'
import type { Role } from '@/lib/auth/permissions'

interface PermitContext {
  id: string
  status: PermitStatus
  applicant_id: string
  project_id: string
}

interface UserContext {
  userId: string
  roles: Role[]
}

interface TransitionResult {
  valid: boolean
  error?: string
  requiresComment?: boolean
  newStatus?: PermitStatus
}

export function validateTransition(
  permit: PermitContext,
  action: PermitAction,
  user: UserContext
): TransitionResult {
  // Check if transition is valid for current status
  if (!canTransition(permit.status, action)) {
    return { valid: false, error: `Cannot ${action} a permit in ${permit.status} status` }
  }

  const transition = getTransition(permit.status, action)!

  // Check role permission (system actions skip role check)
  if (transition.role !== 'system') {
    const hasRole = user.roles.includes(transition.role as Role)
    if (!hasRole) {
      return { valid: false, error: `You do not have permission to ${action} this permit` }
    }
  }

  // Self-action prevention: applicant cannot verify or approve their own permit
  const selfPreventedActions: PermitAction[] = ['verify', 'return', 'approve', 'reject', 'verify_closure', 'return_closure']
  if (selfPreventedActions.includes(action) && user.userId === permit.applicant_id) {
    return { valid: false, error: 'You cannot perform this action on your own permit' }
  }

  return {
    valid: true,
    requiresComment: transition.requiresComment,
    newStatus: transition.to,
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/__tests__/lib/permits/transition.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/permits/transition.ts src/__tests__/lib/permits/transition.test.ts
git commit -m "feat: add permit transition validation with role and self-action checks"
```

---

### Task 7: Permit API Routes — CRUD + Transitions

**Files:**
- Create: `src/app/api/permits/route.ts` (list + create)
- Create: `src/app/api/permits/[id]/route.ts` (get + update)
- Create: `src/app/api/permits/[id]/transition/route.ts` (workflow actions)
- Create: `src/lib/api/response.ts` (helper)

**Step 1: Create API response helper**

Create `src/lib/api/response.ts`:
```typescript
import { NextResponse } from 'next/server'

export function success(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
```

**Step 2: Implement permit list + create**

Create `src/app/api/permits/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { canPerformActionWithRoles } from '@/lib/auth/permissions'
import { success, error } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()
  const projectId = request.nextUrl.searchParams.get('project_id')
  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('permits')
    .select(`
      *,
      permit_types(name, code),
      applicant:user_profiles!applicant_id(name),
      project:projects!project_id(name)
    `)
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)
  if (status) query = query.eq('status', status)

  // Filter to only projects user has access to
  const { data: userRoles } = await supabase
    .from('user_project_roles')
    .select('project_id')
    .eq('user_id', user.id)

  const projectIds = (userRoles ?? []).map((r) => r.project_id)
  query = query.in('project_id', projectIds)

  const { data, error: dbError } = await query
  if (dbError) return error(dbError.message, 500)

  return success(data)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const body = await request.json()
  const { project_id, permit_type_id, work_location, work_description } = body

  const roles = await getUserRolesForProject(user.id, project_id)
  if (!canPerformActionWithRoles(roles, 'create_permit')) {
    return error('You do not have permission to create permits in this project', 403)
  }

  const supabase = await createServerSupabaseClient()

  const { data, error: dbError } = await supabase
    .from('permits')
    .insert({
      project_id,
      permit_type_id,
      applicant_id: user.id,
      work_location,
      work_description,
      status: 'draft',
    })
    .select()
    .single()

  if (dbError) return error(dbError.message, 500)

  // Log creation
  await supabase.from('permit_activity_log').insert({
    permit_id: data.id,
    action: 'created',
    performed_by: user.id,
  })

  return success(data, 201)
}
```

**Step 3: Implement permit get + update**

Create `src/app/api/permits/[id]/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error: dbError } = await supabase
    .from('permits')
    .select(`
      *,
      permit_types(name, code, checklist_template),
      applicant:user_profiles!applicant_id(id, name, email),
      verifier:user_profiles!verifier_id(id, name, email),
      approver:user_profiles!approver_id(id, name, email),
      project:projects!project_id(id, name, location),
      permit_attachments(*),
      permit_activity_log(*, performer:user_profiles!performed_by(name))
    `)
    .eq('id', id)
    .single()

  if (dbError) return error('Permit not found', 404)

  return success(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const body = await request.json()
  const supabase = await createServerSupabaseClient()

  // Only allow editing draft permits by the applicant
  const { data: permit } = await supabase
    .from('permits')
    .select('status, applicant_id')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)
  if (permit.status !== 'draft') return error('Only draft permits can be edited', 400)
  if (permit.applicant_id !== user.id) return error('You can only edit your own permits', 403)

  const allowedFields = [
    'work_location', 'work_description', 'gps_lat', 'gps_lng',
    'scheduled_start', 'scheduled_end', 'checklist_data', 'personnel',
  ]
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  const { data, error: dbError } = await supabase
    .from('permits')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data)
}
```

**Step 4: Implement transition endpoint**

Create `src/app/api/permits/[id]/transition/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { getUserRolesForProject } from '@/lib/auth/get-user-roles'
import { validateTransition } from '@/lib/permits/transition'
import { type PermitAction } from '@/lib/permits/state-machine'
import { success, error } from '@/lib/api/response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const body = await request.json()
  const action = body.action as PermitAction
  const comments = body.comments as string | undefined

  const supabase = await createServerSupabaseClient()

  // Get current permit
  const { data: permit } = await supabase
    .from('permits')
    .select('id, status, applicant_id, project_id')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)

  // Get user roles for this project
  const roles = await getUserRolesForProject(user.id, permit.project_id)

  // Validate transition
  const result = validateTransition(
    { id: permit.id, status: permit.status, applicant_id: permit.applicant_id, project_id: permit.project_id },
    action,
    { userId: user.id, roles }
  )

  if (!result.valid) return error(result.error!, 403)

  if (result.requiresComment && !comments) {
    return error('Comments are required for this action', 400)
  }

  // Build update payload
  const updates: Record<string, unknown> = { status: result.newStatus }
  const now = new Date().toISOString()

  switch (action) {
    case 'submit':
      updates.submitted_at = now
      break
    case 'verify':
      updates.verifier_id = user.id
      updates.verified_at = now
      break
    case 'approve':
      updates.approver_id = user.id
      updates.approved_at = now
      break
    case 'reject':
      updates.approver_id = user.id
      updates.rejection_reason = comments
      break
    case 'activate':
      updates.activated_at = now
      break
    case 'revoke':
      updates.revocation_reason = comments
      break
    case 'verify_closure':
      updates.closed_at = now
      break
  }

  // Execute transition
  const { data: updated, error: dbError } = await supabase
    .from('permits')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) return error(dbError.message, 500)

  // Log activity
  await supabase.from('permit_activity_log').insert({
    permit_id: id,
    action: action === 'submit_closure' ? 'closure_submitted'
      : action === 'verify_closure' ? 'closed'
      : action === 'return_closure' ? 'closure_returned'
      : action,
    performed_by: user.id,
    comments,
  })

  return success(updated)
}
```

**Step 5: Commit**

```bash
git add src/app/api/permits/ src/lib/api/
git commit -m "feat: add permit CRUD and workflow transition API routes"
```

---

## Phase 3: Checklist Engine

### Task 8: Dynamic Checklist Form Component

**Files:**
- Create: `src/components/permits/checklist-form.tsx`
- Create: `src/lib/permits/checklist-validation.ts`
- Test: `src/__tests__/lib/permits/checklist-validation.test.ts`

**Step 1: Write failing tests for validation**

Create `src/__tests__/lib/permits/checklist-validation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateChecklist, type ChecklistTemplate } from '@/lib/permits/checklist-validation'

const template: ChecklistTemplate = {
  sections: [
    {
      title: 'Safety Checks',
      fields: [
        { id: 'harness', type: 'checkbox', label: 'Harness inspected?', required: true },
        { id: 'location', type: 'text', label: 'Work location', required: true },
        { id: 'notes', type: 'text', label: 'Additional notes', required: false },
      ],
    },
  ],
  personnel: [
    { role: 'worker', label: 'Workers', min: 1, max: 10, fields: ['name', 'cert_number'] },
  ],
}

describe('validateChecklist', () => {
  it('passes with all required fields filled', () => {
    const data = { harness: true, location: 'Level 5' }
    const personnel = [{ role: 'worker', name: 'John', cert_number: 'C001' }]
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(true)
  })

  it('fails when required checkbox is unchecked', () => {
    const data = { harness: false, location: 'Level 5' }
    const personnel = [{ role: 'worker', name: 'John', cert_number: 'C001' }]
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Harness inspected? must be checked')
  })

  it('fails when required text field is empty', () => {
    const data = { harness: true, location: '' }
    const personnel = [{ role: 'worker', name: 'John', cert_number: 'C001' }]
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Work location is required')
  })

  it('passes when optional field is empty', () => {
    const data = { harness: true, location: 'Level 5', notes: '' }
    const personnel = [{ role: 'worker', name: 'John', cert_number: 'C001' }]
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(true)
  })

  it('fails when minimum personnel not met', () => {
    const data = { harness: true, location: 'Level 5' }
    const personnel: unknown[] = []
    const result = validateChecklist(template, data, personnel)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('At least 1 Workers required')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/permits/checklist-validation.test.ts`
Expected: FAIL

**Step 3: Implement checklist validation**

Create `src/lib/permits/checklist-validation.ts`:
```typescript
export interface ChecklistField {
  id: string
  type: 'checkbox' | 'text' | 'date' | 'photo' | 'select'
  label: string
  required: boolean
  max?: number
  options?: string[]
}

export interface ChecklistSection {
  title: string
  fields: ChecklistField[]
}

export interface PersonnelRequirement {
  role: string
  label: string
  min: number
  max: number
  fields: string[]
}

export interface ChecklistTemplate {
  sections: ChecklistSection[]
  personnel: PersonnelRequirement[]
}

export interface PersonnelEntry {
  role: string
  [key: string]: unknown
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateChecklist(
  template: ChecklistTemplate,
  data: Record<string, unknown>,
  personnel: PersonnelEntry[]
): ValidationResult {
  const errors: string[] = []

  // Validate checklist fields
  for (const section of template.sections) {
    for (const field of section.fields) {
      if (!field.required) continue

      const value = data[field.id]

      if (field.type === 'checkbox') {
        if (value !== true) {
          errors.push(`${field.label} must be checked`)
        }
      } else if (field.type === 'photo') {
        if (!Array.isArray(value) || value.length === 0) {
          errors.push(`${field.label} is required`)
        }
      } else {
        if (value === undefined || value === null || value === '') {
          errors.push(`${field.label} is required`)
        }
      }
    }
  }

  // Validate personnel requirements
  for (const req of template.personnel) {
    const matching = personnel.filter((p) => p.role === req.role)
    if (matching.length < req.min) {
      errors.push(`At least ${req.min} ${req.label} required`)
    }
    if (matching.length > req.max) {
      errors.push(`Maximum ${req.max} ${req.label} allowed`)
    }
  }

  return { valid: errors.length === 0, errors }
}
```

**Step 4: Run tests**

Run: `npx vitest run src/__tests__/lib/permits/checklist-validation.test.ts`
Expected: PASS

**Step 5: Implement dynamic checklist form component**

Create `src/components/permits/checklist-form.tsx`:
```tsx
'use client'

import { type ChecklistTemplate, type ChecklistField } from '@/lib/permits/checklist-validation'

interface ChecklistFormProps {
  template: ChecklistTemplate
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  disabled?: boolean
}

export function ChecklistForm({ template, data, onChange, disabled }: ChecklistFormProps) {
  function updateField(fieldId: string, value: unknown) {
    onChange({ ...data, [fieldId]: value })
  }

  return (
    <div className="space-y-6">
      {template.sections.map((section) => (
        <fieldset key={section.title} className="border border-gray-200 rounded-lg p-4">
          <legend className="text-lg font-semibold px-2">{section.title}</legend>
          <div className="space-y-4 mt-2">
            {section.fields.map((field) => (
              <ChecklistFieldInput
                key={field.id}
                field={field}
                value={data[field.id]}
                onChange={(value) => updateField(field.id, value)}
                disabled={disabled}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

interface ChecklistFieldInputProps {
  field: ChecklistField
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
}

function ChecklistFieldInput({ field, value, onChange, disabled }: ChecklistFieldInputProps) {
  switch (field.type) {
    case 'checkbox':
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      )

    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )

    case 'date':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="date"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )

    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )

    default:
      return null
  }
}
```

**Step 6: Commit**

```bash
git add src/lib/permits/checklist-validation.ts src/components/permits/checklist-form.tsx src/__tests__/lib/permits/checklist-validation.test.ts
git commit -m "feat: add checklist validation and dynamic form component"
```

---

### Task 9: Seed Default Permit Type Templates

**Files:**
- Create: `supabase/seed.sql`

**Step 1: Create seed data with 7 permit type templates**

Create `supabase/seed.sql`:
```sql
-- Seed default organization
insert into organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Default Organization');

-- Seed 7 permit types
insert into permit_types (organization_id, name, code, checklist_template) values

('00000000-0000-0000-0000-000000000001', 'Work-At-Height', 'WAH', '{
  "sections": [
    {
      "title": "Pre-Work Safety Checks",
      "fields": [
        { "id": "work_height", "type": "text", "label": "Working height (metres)", "required": true },
        { "id": "harness_inspected", "type": "checkbox", "label": "Full body harness inspected and in good condition?", "required": true },
        { "id": "anchor_point", "type": "text", "label": "Anchor point location", "required": true },
        { "id": "guardrails_installed", "type": "checkbox", "label": "Guardrails/barriers installed?", "required": true },
        { "id": "safety_net", "type": "checkbox", "label": "Safety net provided (if applicable)?", "required": false },
        { "id": "weather_checked", "type": "checkbox", "label": "Weather conditions checked and suitable?", "required": true },
        { "id": "rescue_plan", "type": "checkbox", "label": "Rescue plan in place?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Site condition photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "min": 1, "max": 20, "fields": ["name", "trade", "cert_number"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Hot Works', 'HW', '{
  "sections": [
    {
      "title": "Hot Work Safety Checks",
      "fields": [
        { "id": "hot_work_type", "type": "select", "label": "Type of hot work", "required": true, "options": ["Welding", "Cutting", "Brazing", "Grinding", "Soldering"] },
        { "id": "fire_extinguisher", "type": "checkbox", "label": "Fire extinguisher available within 10m?", "required": true },
        { "id": "combustibles_removed", "type": "checkbox", "label": "Combustible materials removed or protected?", "required": true },
        { "id": "fire_watch", "type": "checkbox", "label": "Fire watch person assigned?", "required": true },
        { "id": "ventilation", "type": "checkbox", "label": "Adequate ventilation provided?", "required": true },
        { "id": "gas_test", "type": "checkbox", "label": "Gas test conducted (if applicable)?", "required": false },
        { "id": "site_photo", "type": "photo", "label": "Site condition photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Hot Work Operators", "min": 1, "max": 10, "fields": ["name", "trade", "cert_number"] },
    { "role": "fire_watch", "label": "Fire Watch Person", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Confined Space', 'CS', '{
  "sections": [
    {
      "title": "Confined Space Entry Checks",
      "fields": [
        { "id": "space_description", "type": "text", "label": "Description of confined space", "required": true },
        { "id": "atmosphere_tested", "type": "checkbox", "label": "Atmospheric testing completed?", "required": true },
        { "id": "oxygen_level", "type": "text", "label": "Oxygen level (%)", "required": true },
        { "id": "lel_level", "type": "text", "label": "LEL level (%)", "required": true },
        { "id": "h2s_level", "type": "text", "label": "H2S level (ppm)", "required": true },
        { "id": "co_level", "type": "text", "label": "CO level (ppm)", "required": true },
        { "id": "ventilation_provided", "type": "checkbox", "label": "Mechanical ventilation provided?", "required": true },
        { "id": "rescue_equipment", "type": "checkbox", "label": "Rescue equipment available at entry point?", "required": true },
        { "id": "communication_system", "type": "checkbox", "label": "Communication system in place?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Entry point photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "entrant", "label": "Entrants", "min": 1, "max": 5, "fields": ["name", "cert_number"] },
    { "role": "standby", "label": "Standby Person", "min": 1, "max": 2, "fields": ["name"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Excavation', 'EX', '{
  "sections": [
    {
      "title": "Excavation Safety Checks",
      "fields": [
        { "id": "excavation_depth", "type": "text", "label": "Excavation depth (metres)", "required": true },
        { "id": "underground_services_checked", "type": "checkbox", "label": "Underground services detected and marked?", "required": true },
        { "id": "shoring_installed", "type": "checkbox", "label": "Shoring/support system installed?", "required": true },
        { "id": "barricades", "type": "checkbox", "label": "Barricades and warning signs in place?", "required": true },
        { "id": "access_ladder", "type": "checkbox", "label": "Safe means of access/egress provided?", "required": true },
        { "id": "soil_condition", "type": "text", "label": "Soil condition assessment", "required": true },
        { "id": "water_management", "type": "checkbox", "label": "Water management measures in place?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Excavation site photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "min": 1, "max": 20, "fields": ["name", "trade"] },
    { "role": "operator", "label": "Equipment Operators", "min": 0, "max": 5, "fields": ["name", "cert_number"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Lifting Work', 'LW', '{
  "sections": [
    {
      "title": "Lifting Operation Checks",
      "fields": [
        { "id": "lift_description", "type": "text", "label": "Description of lifting operation", "required": true },
        { "id": "load_weight", "type": "text", "label": "Load weight (tonnes)", "required": true },
        { "id": "crane_type", "type": "text", "label": "Crane type and model", "required": true },
        { "id": "crane_capacity", "type": "text", "label": "Crane SWL (tonnes)", "required": true },
        { "id": "lifting_plan", "type": "checkbox", "label": "Lifting plan reviewed and approved?", "required": true },
        { "id": "exclusion_zone", "type": "checkbox", "label": "Exclusion zone barricaded?", "required": true },
        { "id": "slings_inspected", "type": "checkbox", "label": "Slings and rigging gear inspected?", "required": true },
        { "id": "ground_condition", "type": "checkbox", "label": "Ground condition suitable for crane setup?", "required": true },
        { "id": "wind_speed_checked", "type": "checkbox", "label": "Wind speed within safe limits?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Setup photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "crane_operator", "label": "Crane Operator", "min": 1, "max": 2, "fields": ["name", "license_number"] },
    { "role": "rigger", "label": "Rigger", "min": 1, "max": 4, "fields": ["name", "cert_number"] },
    { "role": "signalman", "label": "Signalman", "min": 1, "max": 2, "fields": ["name", "cert_number"] },
    { "role": "banksman", "label": "Banksman", "min": 0, "max": 2, "fields": ["name"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Demolition', 'DM', '{
  "sections": [
    {
      "title": "Demolition Safety Checks",
      "fields": [
        { "id": "structure_description", "type": "text", "label": "Structure to be demolished", "required": true },
        { "id": "demolition_method", "type": "select", "label": "Demolition method", "required": true, "options": ["Manual", "Mechanical", "Controlled Blasting", "Deconstruction"] },
        { "id": "structural_survey", "type": "checkbox", "label": "Structural survey completed?", "required": true },
        { "id": "asbestos_check", "type": "checkbox", "label": "Asbestos/hazardous material survey completed?", "required": true },
        { "id": "utilities_disconnected", "type": "checkbox", "label": "All utilities disconnected?", "required": true },
        { "id": "exclusion_zone", "type": "checkbox", "label": "Exclusion zone established and barricaded?", "required": true },
        { "id": "dust_control", "type": "checkbox", "label": "Dust suppression measures in place?", "required": true },
        { "id": "debris_management", "type": "checkbox", "label": "Debris management plan in place?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Pre-demolition photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Demolition Workers", "min": 1, "max": 20, "fields": ["name", "trade"] },
    { "role": "operator", "label": "Equipment Operators", "min": 0, "max": 5, "fields": ["name", "cert_number"] }
  ]
}'),

('00000000-0000-0000-0000-000000000001', 'Piling Work', 'PW', '{
  "sections": [
    {
      "title": "Piling Work Safety Checks",
      "fields": [
        { "id": "pile_type", "type": "select", "label": "Type of piling", "required": true, "options": ["Bored Pile", "Driven Pile", "Sheet Pile", "Micro Pile"] },
        { "id": "pile_depth", "type": "text", "label": "Design pile depth (metres)", "required": true },
        { "id": "underground_services", "type": "checkbox", "label": "Underground services detection completed?", "required": true },
        { "id": "piling_rig_inspected", "type": "checkbox", "label": "Piling rig inspected and certified?", "required": true },
        { "id": "exclusion_zone", "type": "checkbox", "label": "Exclusion zone established?", "required": true },
        { "id": "noise_control", "type": "checkbox", "label": "Noise and vibration control measures in place?", "required": true },
        { "id": "adjacent_structures", "type": "checkbox", "label": "Adjacent structures surveyed and monitored?", "required": true },
        { "id": "spoil_management", "type": "checkbox", "label": "Spoil management plan in place?", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Piling site photos", "required": true, "max": 5 }
      ]
    }
  ],
  "personnel": [
    { "role": "operator", "label": "Piling Rig Operator", "min": 1, "max": 2, "fields": ["name", "cert_number"] },
    { "role": "worker", "label": "Workers", "min": 1, "max": 15, "fields": ["name", "trade"] }
  ]
}');
```

**Step 2: Verify seed file syntax**

Run: `npx supabase db lint`
Expected: No errors

**Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: add seed data for 7 default permit type templates"
```

---

## Phase 4: Worker Registry

### Task 10: Worker CRUD API + UI

**Files:**
- Create: `src/app/api/workers/route.ts`
- Create: `src/app/api/workers/[id]/route.ts`
- Create: `src/app/workers/page.tsx`
- Create: `src/components/workers/worker-form.tsx`
- Create: `src/components/workers/worker-list.tsx`
- Create: `src/components/permits/personnel-picker.tsx`

**Step 1: Create worker API**

Create `src/app/api/workers/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()
  const search = request.nextUrl.searchParams.get('search')

  let query = supabase
    .from('workers')
    .select('*')
    .eq('organization_id', user.organization_id)
    .eq('is_active', true)
    .order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,cert_number.ilike.%${search}%,company.ilike.%${search}%`)
  }

  const { data, error: dbError } = await query
  if (dbError) return error(dbError.message, 500)

  return success(data)
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const body = await request.json()

  const supabase = await createServerSupabaseClient()
  const { data, error: dbError } = await supabase
    .from('workers')
    .insert({
      organization_id: user.organization_id,
      name: body.name,
      phone: body.phone,
      company: body.company,
      trade: body.trade,
      cert_number: body.cert_number,
      cert_expiry: body.cert_expiry,
    })
    .select()
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data, 201)
}
```

**Step 2: Create personnel picker component**

Create `src/components/permits/personnel-picker.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { type PersonnelRequirement } from '@/lib/permits/checklist-validation'

interface Worker {
  id: string
  name: string
  company: string
  trade: string
  cert_number: string
  cert_expiry: string | null
}

interface PersonnelEntry {
  role: string
  worker_id?: string
  name: string
  [key: string]: unknown
}

interface PersonnelPickerProps {
  requirements: PersonnelRequirement[]
  personnel: PersonnelEntry[]
  onChange: (personnel: PersonnelEntry[]) => void
  disabled?: boolean
}

export function PersonnelPicker({ requirements, personnel, onChange, disabled }: PersonnelPickerProps) {
  const [workers, setWorkers] = useState<Worker[]>([])

  useEffect(() => {
    fetch('/api/workers')
      .then((r) => r.json())
      .then((res) => setWorkers(res.data ?? []))
  }, [])

  function addPerson(role: string) {
    onChange([...personnel, { role, name: '' }])
  }

  function removePerson(index: number) {
    onChange(personnel.filter((_, i) => i !== index))
  }

  function updatePerson(index: number, updates: Partial<PersonnelEntry>) {
    const updated = [...personnel]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  function selectFromRegistry(index: number, workerId: string) {
    const worker = workers.find((w) => w.id === workerId)
    if (!worker) return
    updatePerson(index, {
      worker_id: worker.id,
      name: worker.name,
      cert_number: worker.cert_number,
    })
  }

  return (
    <div className="space-y-6">
      {requirements.map((req) => {
        const rolePersonnel = personnel
          .map((p, i) => ({ ...p, _index: i }))
          .filter((p) => p.role === req.role)

        return (
          <div key={req.role} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">
                {req.label}
                <span className="text-sm text-gray-500 ml-2">
                  (min: {req.min}, max: {req.max})
                </span>
              </h4>
              {!disabled && rolePersonnel.length < req.max && (
                <button
                  type="button"
                  onClick={() => addPerson(req.role)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Add {req.label}
                </button>
              )}
            </div>
            {rolePersonnel.map((person) => (
              <div key={person._index} className="flex gap-2 mb-2 items-end">
                <div className="flex-1">
                  <select
                    value={person.worker_id ?? ''}
                    onChange={(e) =>
                      e.target.value
                        ? selectFromRegistry(person._index, e.target.value)
                        : updatePerson(person._index, { worker_id: undefined })
                    }
                    disabled={disabled}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-1"
                  >
                    <option value="">-- Select from registry or type below --</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.company})</option>
                    ))}
                  </select>
                  {req.fields.map((field) => (
                    <input
                      key={field}
                      type="text"
                      placeholder={field.replace('_', ' ')}
                      value={String(person[field] ?? '')}
                      onChange={(e) => updatePerson(person._index, { [field]: e.target.value })}
                      disabled={disabled}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm mt-1"
                    />
                  ))}
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removePerson(person._index)}
                    className="text-red-500 text-sm px-2 py-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/api/workers/ src/components/workers/ src/components/permits/personnel-picker.tsx src/app/workers/
git commit -m "feat: add worker registry CRUD and personnel picker component"
```

---

## Phase 5: File Attachments

### Task 11: File Upload API + Component

**Files:**
- Create: `src/app/api/permits/[id]/attachments/route.ts`
- Create: `src/components/permits/file-upload.tsx`

**Step 1: Implement attachment API**

Create `src/app/api/permits/[id]/attachments/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Verify permit exists and user has access
  const { data: permit } = await supabase
    .from('permits')
    .select('id, project_id, applicant_id')
    .eq('id', id)
    .single()

  if (!permit) return error('Permit not found', 404)

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return error('No file provided', 400)

  // Validate file type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return error('File type not allowed. Accepted: JPG, PNG, PDF', 400)
  }
  if (file.size > 10 * 1024 * 1024) {
    return error('File size exceeds 10MB limit', 400)
  }

  // Upload to Supabase Storage
  const filePath = `${user.organization_id}/${permit.project_id}/${id}/${Date.now()}-${file.name}`
  const serviceClient = await createServiceRoleClient()

  const { error: uploadError } = await serviceClient.storage
    .from('permit-attachments')
    .upload(filePath, file)

  if (uploadError) return error(uploadError.message, 500)

  // Save attachment record
  const { data, error: dbError } = await supabase
    .from('permit_attachments')
    .insert({
      permit_id: id,
      file_url: filePath,
      file_name: file.name,
      file_type: file.type,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (dbError) return error(dbError.message, 500)

  return success(data, 201)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error: dbError } = await supabase
    .from('permit_attachments')
    .select('*, uploader:user_profiles!uploaded_by(name)')
    .eq('permit_id', id)
    .order('created_at')

  if (dbError) return error(dbError.message, 500)

  // Generate signed URLs
  const serviceClient = await createServiceRoleClient()
  const withUrls = await Promise.all(
    (data ?? []).map(async (att) => {
      const { data: urlData } = await serviceClient.storage
        .from('permit-attachments')
        .createSignedUrl(att.file_url, 3600)
      return { ...att, signed_url: urlData?.signedUrl }
    })
  )

  return success(withUrls)
}
```

**Step 2: Create file upload component**

Create `src/components/permits/file-upload.tsx`:
```tsx
'use client'

import { useState, useRef } from 'react'

interface Attachment {
  id: string
  file_name: string
  file_type: string
  signed_url?: string
  uploader?: { name: string }
  created_at: string
}

interface FileUploadProps {
  permitId: string
  attachments: Attachment[]
  onUploadComplete: () => void
  disabled?: boolean
}

export function FileUpload({ permitId, attachments, onUploadComplete, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`/api/permits/${permitId}/attachments`, {
      method: 'POST',
      body: formData,
    })

    const result = await res.json()
    if (!res.ok) {
      setError(result.error)
    } else {
      onUploadComplete()
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {!disabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload Attachment (JPG, PNG, PDF — max 10MB)
          </label>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="text-sm"
          />
          {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="divide-y divide-gray-200">
          {attachments.map((att) => (
            <li key={att.id} className="py-2 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{att.file_name}</p>
                <p className="text-xs text-gray-500">
                  Uploaded by {att.uploader?.name} on {new Date(att.created_at).toLocaleDateString()}
                </p>
              </div>
              {att.signed_url && (
                <a
                  href={att.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/api/permits/*/attachments/ src/components/permits/file-upload.tsx
git commit -m "feat: add file attachment upload/download with signed URLs"
```

---

## Phase 6: Notifications

### Task 12: Notification System

**Files:**
- Create: `src/lib/notifications/send.ts`
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/[id]/read/route.ts`
- Create: `src/components/notifications/notification-bell.tsx`
- Test: `src/__tests__/lib/notifications/send.test.ts`

**Step 1: Write failing test**

Create `src/__tests__/lib/notifications/send.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getNotificationRecipients } from '@/lib/notifications/recipients'

describe('getNotificationRecipients', () => {
  it('returns verifiers when permit is submitted', () => {
    const result = getNotificationRecipients('submitted', {
      applicant_id: 'user-1',
      verifier_id: null,
      approver_id: null,
    })
    expect(result.targetRoles).toEqual(['verifier'])
  })

  it('returns approvers when permit is verified', () => {
    const result = getNotificationRecipients('verified', {
      applicant_id: 'user-1',
      verifier_id: 'user-2',
      approver_id: null,
    })
    expect(result.targetRoles).toEqual(['approver'])
  })

  it('returns applicant when permit is approved', () => {
    const result = getNotificationRecipients('approved', {
      applicant_id: 'user-1',
      verifier_id: 'user-2',
      approver_id: 'user-3',
    })
    expect(result.targetUserIds).toEqual(['user-1'])
  })

  it('returns applicant when permit is rejected', () => {
    const result = getNotificationRecipients('rejected', {
      applicant_id: 'user-1',
      verifier_id: 'user-2',
      approver_id: 'user-3',
    })
    expect(result.targetUserIds).toEqual(['user-1'])
  })

  it('returns applicant and verifier when permit is revoked', () => {
    const result = getNotificationRecipients('revoked', {
      applicant_id: 'user-1',
      verifier_id: 'user-2',
      approver_id: 'user-3',
    })
    expect(result.targetUserIds).toEqual(['user-1', 'user-2'])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/notifications/send.test.ts`
Expected: FAIL

**Step 3: Implement notification recipients logic**

Create `src/lib/notifications/recipients.ts`:
```typescript
import type { PermitStatus } from '@/lib/permits/state-machine'
import type { Role } from '@/lib/auth/permissions'

interface PermitParties {
  applicant_id: string
  verifier_id: string | null
  approver_id: string | null
}

interface NotificationTarget {
  targetRoles?: Role[]
  targetUserIds?: string[]
}

export function getNotificationRecipients(
  newStatus: PermitStatus,
  parties: PermitParties
): NotificationTarget {
  switch (newStatus) {
    case 'submitted':
    case 'closure_submitted':
      return { targetRoles: ['verifier'] }

    case 'verified':
      return { targetRoles: ['approver'] }

    case 'draft': // returned to draft
      return { targetUserIds: [parties.applicant_id] }

    case 'approved':
    case 'rejected':
    case 'closed':
      return { targetUserIds: [parties.applicant_id] }

    case 'revoked':
      return {
        targetUserIds: [
          parties.applicant_id,
          ...(parties.verifier_id ? [parties.verifier_id] : []),
        ],
      }

    case 'active': // could be return_closure or activation
      return { targetUserIds: [parties.applicant_id] }

    default:
      return {}
  }
}
```

Create `src/lib/notifications/send.ts`:
```typescript
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getNotificationRecipients } from './recipients'
import type { PermitStatus } from '@/lib/permits/state-machine'

interface SendNotificationParams {
  permitId: string
  permitNumber: string
  projectId: string
  newStatus: PermitStatus
  parties: {
    applicant_id: string
    verifier_id: string | null
    approver_id: string | null
  }
}

const STATUS_MESSAGES: Record<string, { title: string; message: string }> = {
  submitted: { title: 'Permit Submitted for Verification', message: 'A new permit requires your verification.' },
  verified: { title: 'Permit Verified', message: 'A permit has been verified and requires your approval.' },
  approved: { title: 'Permit Approved', message: 'Your permit has been approved.' },
  rejected: { title: 'Permit Rejected', message: 'Your permit has been rejected.' },
  revoked: { title: 'Permit Revoked', message: 'A permit has been revoked.' },
  active: { title: 'Permit Active', message: 'A permit is now active.' },
  closure_submitted: { title: 'Closure Report Submitted', message: 'A closure report requires your verification.' },
  closed: { title: 'Permit Closed', message: 'Your permit has been closed out.' },
  draft: { title: 'Permit Returned', message: 'Your permit has been returned for revision.' },
}

export async function sendPermitNotifications(params: SendNotificationParams) {
  const { permitId, permitNumber, projectId, newStatus, parties } = params
  const supabase = await createServiceRoleClient()

  const target = getNotificationRecipients(newStatus, parties)
  const template = STATUS_MESSAGES[newStatus]
  if (!template) return

  let recipientIds: string[] = []

  if (target.targetUserIds) {
    recipientIds = target.targetUserIds
  }

  if (target.targetRoles) {
    const { data: roleUsers } = await supabase
      .from('user_project_roles')
      .select('user_id')
      .eq('project_id', projectId)
      .in('role', target.targetRoles)

    recipientIds = [...recipientIds, ...(roleUsers ?? []).map((r) => r.user_id)]
  }

  // Deduplicate
  recipientIds = [...new Set(recipientIds)]

  // Insert in-app notifications
  const notifications = recipientIds.map((userId) => ({
    user_id: userId,
    permit_id: permitId,
    type: newStatus,
    title: `${template.title} — ${permitNumber}`,
    message: template.message,
  }))

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }

  // TODO: Send email notifications via Resend (Phase 6 enhancement)
}
```

**Step 4: Run tests**

Run: `npx vitest run src/__tests__/lib/notifications/send.test.ts`
Expected: PASS

**Step 5: Create notification API and bell component**

Create `src/app/api/notifications/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const supabase = await createServerSupabaseClient()
  const { data, error: dbError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (dbError) return error(dbError.message, 500)

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return success({ notifications: data, unread_count: count ?? 0 })
}
```

Create `src/app/api/notifications/[id]/read/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { success, error } from '@/lib/api/response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return error('Unauthorized', 401)

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  if (id === 'all') {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  } else {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)
  }

  return success({ ok: true })
}
```

**Step 6: Commit**

```bash
git add src/lib/notifications/ src/app/api/notifications/ src/__tests__/lib/notifications/ src/components/notifications/
git commit -m "feat: add notification system with in-app delivery and recipient logic"
```

---

## Phase 7: Dashboard + UI Pages

### Task 13: App Layout Shell

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/mobile-nav.tsx`

This task creates the responsive app shell with sidebar (desktop) / hamburger (mobile), header with notification bell, and user profile. Implementation is standard React components with Tailwind responsive classes. Follow the page map from the design doc.

**Step 1: Implement layout components**

These are standard UI components. Build sidebar with navigation links based on user roles, header with notification bell, and responsive mobile nav.

**Step 2: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add responsive app layout with sidebar and mobile nav"
```

---

### Task 14: Dashboard Page

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/api/dashboard/stats/route.ts`

This task creates the dashboard with 4 widgets: My Pending Actions, Permits by Status, Expiring Soon, Recent Activity. The stats API aggregates data from permits and activity log tables.

**Step 1: Implement dashboard stats API and page**

**Step 2: Commit**

```bash
git add src/app/dashboard/ src/app/api/dashboard/
git commit -m "feat: add dashboard page with status widgets and pending actions"
```

---

### Task 15: Permit List + Create + Detail Pages

**Files:**
- Create: `src/app/permits/page.tsx`
- Create: `src/app/permits/new/page.tsx`
- Create: `src/app/permits/[id]/page.tsx`
- Create: `src/app/permits/[id]/edit/page.tsx`
- Create: `src/app/permits/[id]/close/page.tsx`
- Create: `src/components/permits/permit-card.tsx`
- Create: `src/components/permits/status-badge.tsx`
- Create: `src/components/permits/action-bar.tsx`

Key implementation details:
- Permit list: filterable by project, type, status. Shows permit cards with status badge.
- Create: select project → select type → load dynamic checklist form + personnel picker
- Detail: tabbed view (Details, Checklist, Personnel, Attachments, Activity Log)
- Action bar: shows available actions based on current user's role + permit status (uses `getAvailableTransitions` + `validateTransition`)
- Close page: closure report form

**Step 1: Implement pages and components**

**Step 2: Commit**

```bash
git add src/app/permits/ src/components/permits/
git commit -m "feat: add permit list, create, detail, edit, and close pages"
```

---

### Task 16: Project + User Management Pages (Admin)

**Files:**
- Create: `src/app/projects/page.tsx`
- Create: `src/app/projects/[id]/page.tsx`
- Create: `src/app/projects/[id]/settings/page.tsx`
- Create: `src/app/users/page.tsx`
- Create: `src/app/users/invite/page.tsx`
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`
- Create: `src/app/api/projects/[id]/roles/route.ts`
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/invite/route.ts`

Admin-only pages. Project settings allows assigning roles to users per project. User invite creates Supabase auth user + user_profile.

**Step 1: Implement admin pages and APIs**

**Step 2: Commit**

```bash
git add src/app/projects/ src/app/users/ src/app/api/projects/ src/app/api/users/
git commit -m "feat: add project and user management pages for admin"
```

---

## Phase 8: Expiry Cron + Final Integration

### Task 17: Permit Expiry Cron Job

**Files:**
- Create: `src/app/api/cron/expiry-check/route.ts`

**Step 1: Implement expiry check endpoint**

Create `src/app/api/cron/expiry-check/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendPermitNotifications } from '@/lib/notifications/send'
import { success, error } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return error('Unauthorized', 401)
  }

  const supabase = await createServiceRoleClient()
  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Find active/approved permits expiring within 48 hours
  const { data: expiringPermits } = await supabase
    .from('permits')
    .select('id, permit_number, project_id, applicant_id, verifier_id, approver_id')
    .in('status', ['approved', 'active'])
    .lte('scheduled_end', in48h.toISOString())
    .gte('scheduled_end', now.toISOString())

  for (const permit of expiringPermits ?? []) {
    await sendPermitNotifications({
      permitId: permit.id,
      permitNumber: permit.permit_number,
      projectId: permit.project_id,
      newStatus: 'active', // reuse active notification template
      parties: {
        applicant_id: permit.applicant_id,
        verifier_id: permit.verifier_id,
        approver_id: permit.approver_id,
      },
    })
  }

  return success({ checked: expiringPermits?.length ?? 0 })
}
```

Configure this as a Vercel Cron Job in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/expiry-check",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Step 2: Commit**

```bash
git add src/app/api/cron/ vercel.json
git commit -m "feat: add daily permit expiry check cron job"
```

---

### Task 18: Row Level Security Policies

**Files:**
- Create: `supabase/migrations/002_rls_policies.sql`

**Step 1: Add RLS policies as safety net**

Create `supabase/migrations/002_rls_policies.sql`:
```sql
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
```

**Step 2: Commit**

```bash
git add supabase/migrations/002_rls_policies.sql
git commit -m "feat: add Row Level Security policies for all tables"
```

---

### Task 19: Integration Testing + Smoke Test

**Files:**
- Create: `src/__tests__/integration/permit-lifecycle.test.ts`

**Step 1: Write integration test for full permit lifecycle**

Create `src/__tests__/integration/permit-lifecycle.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateTransition } from '@/lib/permits/transition'
import { validateChecklist } from '@/lib/permits/checklist-validation'
import { getNotificationRecipients } from '@/lib/notifications/recipients'

describe('Full permit lifecycle', () => {
  const applicant = { userId: 'applicant-1', roles: ['applicant'] as const }
  const verifier = { userId: 'verifier-1', roles: ['verifier'] as const }
  const approver = { userId: 'approver-1', roles: ['approver'] as const }

  const permit = {
    id: 'permit-1',
    applicant_id: 'applicant-1',
    project_id: 'project-1',
  }

  it('follows complete happy path: draft -> submitted -> verified -> approved -> active -> closure_submitted -> closed', () => {
    // Submit
    let result = validateTransition({ ...permit, status: 'draft' }, 'submit', applicant)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('submitted')

    // Verify
    result = validateTransition({ ...permit, status: 'submitted' }, 'verify', verifier)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('verified')

    // Approve
    result = validateTransition({ ...permit, status: 'verified' }, 'approve', approver)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('approved')

    // Submit closure
    result = validateTransition({ ...permit, status: 'active' }, 'submit_closure', applicant)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('closure_submitted')

    // Verify closure
    result = validateTransition({ ...permit, status: 'closure_submitted' }, 'verify_closure', verifier)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('closed')
  })

  it('follows rejection path: draft -> submitted -> verified -> rejected', () => {
    let result = validateTransition({ ...permit, status: 'draft' }, 'submit', applicant)
    expect(result.valid).toBe(true)

    result = validateTransition({ ...permit, status: 'submitted' }, 'verify', verifier)
    expect(result.valid).toBe(true)

    result = validateTransition({ ...permit, status: 'verified' }, 'reject', approver)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('rejected')
    expect(result.requiresComment).toBe(true)
  })

  it('follows revocation path: active -> revoked', () => {
    const result = validateTransition({ ...permit, status: 'active' }, 'revoke', approver)
    expect(result.valid).toBe(true)
    expect(result.newStatus).toBe('revoked')
    expect(result.requiresComment).toBe(true)
  })

  it('prevents skipping: draft cannot jump to approved', () => {
    const result = validateTransition({ ...permit, status: 'draft' }, 'approve', approver)
    expect(result.valid).toBe(false)
  })

  it('prevents self-action: applicant cannot verify own permit', () => {
    const result = validateTransition(
      { ...permit, status: 'submitted' },
      'verify',
      { userId: 'applicant-1', roles: ['verifier'] }
    )
    expect(result.valid).toBe(false)
  })

  it('notifications go to correct recipients at each step', () => {
    const parties = {
      applicant_id: 'applicant-1',
      verifier_id: 'verifier-1',
      approver_id: 'approver-1',
    }

    expect(getNotificationRecipients('submitted', parties).targetRoles).toEqual(['verifier'])
    expect(getNotificationRecipients('verified', parties).targetRoles).toEqual(['approver'])
    expect(getNotificationRecipients('approved', parties).targetUserIds).toEqual(['applicant-1'])
    expect(getNotificationRecipients('rejected', parties).targetUserIds).toEqual(['applicant-1'])
    expect(getNotificationRecipients('revoked', parties).targetUserIds).toEqual(['applicant-1', 'verifier-1'])
  })
})
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/__tests__/integration/
git commit -m "test: add integration test for full permit lifecycle"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-4 | Scaffolding, database, auth, permissions |
| 2 | 5-7 | State machine, transition validation, permit API |
| 3 | 8-9 | Checklist engine, seed templates |
| 4 | 10 | Worker registry and personnel picker |
| 5 | 11 | File attachments with signed URLs |
| 6 | 12 | Notification system |
| 7 | 13-16 | Dashboard, permit pages, admin pages |
| 8 | 17-19 | Expiry cron, RLS, integration tests |

**Total: 19 tasks across 8 phases.**
