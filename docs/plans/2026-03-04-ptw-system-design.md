# PTW System Design — Singapore Construction ePTW

**Date:** 2026-03-04
**Status:** Approved

---

## Overview

A Permit-To-Work (PTW) system for Singapore construction sites, compliant with MOM ePTW specifications (Annex B, effective 1 April 2024). Applicants (Supervisors/Engineers) apply for high-risk work permits, Verifiers (WSHC/WSHO) verify checklist completion, and Approvers (Project Managers) approve or reject.

### Scope — v1

- 7 permit types: Demolition, Confined Space, Excavation, Hot Works, Lifting Work, Piling Work, Work-At-Height
- Full PTW lifecycle with close-out
- Responsive web app (mobile app later)
- Multi-project, single organization (architected for multi-tenant)
- <50 concurrent users initially

### Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (React), responsive |
| Backend | Next.js API routes |
| Database | PostgreSQL via Supabase (JSONB for checklists) |
| Auth | Supabase Auth (email/phone + password) |
| File Storage | Supabase Storage (private, signed URLs) |
| Email | Resend or SendGrid (via background jobs) |

---

## 1. Data Model

### Core Tables

```
organizations
  id, name, created_at

projects
  id, organization_id, name, location, status, created_at

users
  id, email, phone, name, password_hash, created_at

user_project_roles
  id, user_id, project_id, role (applicant|verifier|approver|admin)

permit_types
  id, organization_id, name, code (e.g. "WAH", "HW")
  checklist_template (JSONB)
  is_active

permits
  id, permit_number (unique, e.g. "PTW-2026-0001")
  project_id, permit_type_id
  status (draft|submitted|verified|approved|active|closure_submitted|closed|rejected|revoked)
  applicant_id, verifier_id, approver_id
  work_location, work_description
  gps_lat, gps_lng
  scheduled_start, scheduled_end
  checklist_data (JSONB)
  personnel (JSONB)
  submitted_at, verified_at, approved_at, closed_at
  rejection_reason, revocation_reason
  created_at, updated_at

permit_attachments
  id, permit_id, file_url, file_name, file_type, uploaded_by, created_at

permit_activity_log
  id, permit_id, action, performed_by, comments, created_at
```

### Supporting Tables

```
workers
  id, organization_id, name, phone, company, trade
  cert_number, cert_expiry, is_active, created_at

notifications
  id, user_id, permit_id, type, title, message
  is_read, created_at
```

### JSONB Structure — Checklist Template (on permit_types)

```json
{
  "sections": [
    {
      "title": "Pre-Work Safety Checks",
      "fields": [
        { "id": "harness_check", "type": "checkbox", "label": "Full body harness inspected?", "required": true },
        { "id": "anchor_point", "type": "text", "label": "Anchor point location", "required": true },
        { "id": "site_photo", "type": "photo", "label": "Site condition photo", "required": true, "max": 3 }
      ]
    }
  ],
  "personnel": [
    { "role": "worker", "label": "Workers", "min": 1, "max": 20, "fields": ["name", "cert_number"] }
  ]
}
```

### JSONB Structure — Checklist Data (on permits, filled-in responses)

```json
{
  "harness_check": true,
  "anchor_point": "Grid line A3, Level 12",
  "site_photo": ["file-uuid-1", "file-uuid-2"]
}
```

### Personnel Variations by Permit Type

- **Work-At-Height**: list of workers (name, NRIC/FIN last 4, trade, CSOC cert number)
- **Lifting Work**: Crane Operator (name, license), Rigger (name, cert), Signalman (name, cert), Banksman (optional)
- **Others**: defined per permit type in `checklist_template.personnel`

### Worker Registry

- Hybrid model: maintained registry + manual entry for ad-hoc workers (subcontractors)
- v1 fields: name, phone, company, trade, cert_number, cert_expiry
- Future: photo, NRIC/FIN (masked), safety training records, medical fitness date

---

## 2. Workflow & State Machine

### Permit Lifecycle

```
DRAFT → SUBMITTED → VERIFIED → APPROVED → ACTIVE → CLOSURE_SUBMITTED → CLOSED
                                    ↓           ↓
                                REJECTED     REVOKED
```

With return paths: Verifier can return to Draft, Verifier can return closure to Active.

### State Transition Rules

| From | Action | To | Who | Validations |
|------|--------|----|-----|-------------|
| Draft | submit | Submitted | Applicant (owner) | Required fields filled, workers listed, dates set |
| Submitted | verify | Verified | Verifier (not applicant) | Confirms checklist adequate |
| Submitted | return | Draft | Verifier | Comments required |
| Verified | approve | Approved | Approver (not applicant) | — |
| Verified | reject | Rejected | Approver | Rejection reason required |
| Approved | activate | Active | System (auto) or Approver | scheduled_start reached or manual |
| Active | submit_closure | Closure Submitted | Applicant | Closure report filled |
| Active | revoke | Revoked | Approver | Revocation reason required |
| Closure Submitted | verify_closure | Closed | Verifier | Confirms closure satisfactory |
| Closure Submitted | return_closure | Active | Verifier | Comments required |

### Enforced Rules

- No skipping steps (MOM requirement)
- Self-action prevention: applicant cannot verify or approve own permit
- Every transition logged to `permit_activity_log`

---

## 3. Authentication & Authorization

### Authentication

- Supabase Auth: email or phone + password
- JWT tokens (stateless)
- No self-registration — Admin invites users
- Password reset via email

### Authorization

- Project-scoped roles via `user_project_roles`
- One user can have different roles on different projects
- Admin is a system management role, not a workflow role

### Role Permissions

| Action | Applicant | Verifier | Approver | Admin |
|--------|-----------|----------|----------|-------|
| Create permit | Yes | — | — | — |
| Edit draft (own) | Yes | — | — | — |
| Submit permit (own) | Yes | — | — | — |
| Verify permit | — | Yes | — | — |
| Return to draft | — | Yes | — | — |
| Approve permit | — | — | Yes | — |
| Reject permit | — | — | Yes | — |
| Revoke permit | — | — | Yes | — |
| Submit closure (own) | Yes | — | — | — |
| Verify closure | — | Yes | — | — |
| View permits (project) | Yes | Yes | Yes | Yes |
| Manage users | — | — | — | Yes |
| Manage projects | — | — | — | Yes |
| Manage permit types | — | — | — | Yes |
| Manage worker registry | Yes | — | — | Yes |
| View dashboard stats | Yes (own) | Yes | Yes | Yes |

---

## 4. Pages & UI

### Page Map

```
/login                          — Public (only unauthenticated page)
/dashboard                      — Summary stats, pending actions, expiring permits
/projects                       — Project list (Admin: all, others: assigned only)
/projects/[id]                  — Project detail, team, permit summary
/projects/[id]/settings         — Assign user roles (Admin)
/permits                        — Filterable permit list
/permits/new                    — Create permit (select project + type → dynamic form)
/permits/[id]                   — Permit detail: tabs for Details, Checklist, Personnel, Attachments, Activity Log
/permits/[id]/edit              — Edit draft
/permits/[id]/close             — Submit closure report
/workers                        — Worker registry (Admin + Applicants)
/users                          — User management (Admin)
/users/invite                   — Invite user (Admin)
/notifications                  — Notification center
/settings                       — Profile, change password
```

### All pages require authentication except `/login`.

### Dashboard Widgets (v1)

- My Pending Actions (permits waiting for your action)
- Permits by Status (count cards)
- Expiring Soon (within 48 hours)
- Recent Activity (last 10 entries)

### Responsive Design

- Desktop: sidebar navigation + content area
- Tablet/Mobile: hamburger menu, stacked layout, fixed action bar at bottom
- Mobile camera capture for photo uploads

---

## 5. Notifications

### Triggers

| Event | Recipients | Channel |
|-------|-----------|---------|
| Permit submitted | Verifier(s) | In-app + email |
| Permit returned to draft | Applicant | In-app + email |
| Permit verified | Approver(s) | In-app + email |
| Permit approved | Applicant | In-app + email |
| Permit rejected | Applicant | In-app + email |
| Permit revoked | Applicant + Verifier | In-app + email |
| Closure submitted | Verifier(s) | In-app + email |
| Closure verified (closed) | Applicant | In-app + email |
| Closure returned | Applicant | In-app + email |
| Permit expiring (48h) | Applicant + Approver | In-app + email |
| Permit expired | Applicant + Approver | In-app + email |

### Implementation

- In-app: `notifications` table, badge count in nav, notification center page
- Email: sent via background job (not inline), using Resend or SendGrid
- Expiry: daily cron job scans `scheduled_end` within 48 hours
- Future: WhatsApp channel (additive, same notification logic)

---

## 6. File Storage & Security

### Storage

- Supabase Storage (S3-compatible), private buckets
- Path: `/{organization_id}/{project_id}/{permit_id}/{filename}`
- Signed URLs with 1-hour expiry for downloads
- Supported: JPG, PNG, PDF, DWG/DXF
- Max 10MB per file
- Mobile camera capture supported

### Security Architecture

- Browser never talks directly to Supabase for data — all through Next.js API routes
- Supabase Auth for login/token refresh (direct, standard)
- Service role key server-side only
- Row Level Security (RLS) on all tables as safety net
- No hard deletes on permits or activity logs

---

## 7. MOM ePTW Compliance

| # | MOM Requirement | Implementation |
|---|----------------|----------------|
| 1 | System must manage PTWs | Core application purpose |
| 2 | Required fields: date, time, requester, assessor, approver, location, description, photos, checkboxes | Enforced at submit validation |
| 3 | GPS location capture | Browser geolocation API on submit |
| 4 | Pre-set workflows, not skippable | Hardcoded state machine |
| 5 | Only authorized persons assess/approve | Role-based access + self-action prevention |
| 6 | Capture text, date, photos, comments, timestamps, identity | JSONB data + activity log |
| 7 | Attachments routed electronically, notifications on submission | File upload + notification triggers |
| 8 | Permit expiry deadline + automated alerts | `scheduled_end` + daily cron job |
| 9 | Authorized person can revoke | Approver revoke action |
| 10 | Information viewable/validated by deadline | Dashboard + deadline enforcement |
| 11 | Web dashboard showing permit status | Dashboard with status counts + filterable list |
| 12 | Unique ID per permit | `permit_number` with unique constraint |
| 13 | English default language | English only for v1 |
| 14 | Run on Android + iOS | Responsive web in mobile browsers |
| — | 5-year record retention | Soft-delete only, no hard deletion |

---

## Future Enhancements (Out of Scope for v1)

- Admin-configurable permit types and checklists
- Multi-tenant (SaaS) support
- Native mobile app
- WhatsApp notifications
- Full reporting and analytics (exportable reports, charts, trends)
- Detailed worker profiles (photo, training records, medical fitness)
- Worker conflict detection (same worker on overlapping active PTWs)
- Worker cert expiry alerts
