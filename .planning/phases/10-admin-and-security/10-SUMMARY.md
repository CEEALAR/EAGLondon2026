---
phase: 10-admin-and-security
plan: "(none — post-launch direct work)"
subsystem: admin, security, ux
tags: [admin, stats, priority, security, csp, ssrf, audit-log]
dependency_graph:
  requires: [phase-07, phase-08, phase-09]
  provides: [admin-ops-stats, priority-edit-ui, security-hardening]
  affects: [admin-page, attendees, meetings, auth-callback, ical-sync, middleware]
tech_stack:
  added: []
  patterns:
    - "service-role admin client per route (existing pattern continued)"
    - "PATCH endpoint with audit row appended to activity table"
    - "CSP via middleware applied to all responses including redirects"
    - "URL allowlist via new URL() parse, not regex"
key_files:
  created:
    - ceealar-pulse/lib/admin-stats.ts
    - ceealar-pulse/app/api/admin/sync-all/route.ts
    - ceealar-pulse/app/(app)/admin/_components/sync-all-button.tsx
    - ceealar-pulse/components/priority-editor.tsx
    - ceealar-pulse/app/api/attendees/[id]/priority/route.ts
    - ceealar-pulse/supabase/migrations/0010_drop_prep_note.sql
  modified:
    - ceealar-pulse/app/(app)/admin/page.tsx
    - ceealar-pulse/app/(app)/attendees/[id]/page.tsx
    - ceealar-pulse/app/(app)/attendees/_components/attendee-profile-section.tsx
    - ceealar-pulse/app/(app)/meetings/[id]/page.tsx
    - ceealar-pulse/app/auth/callback/route.ts
    - ceealar-pulse/lib/ical-sync.ts
    - ceealar-pulse/lib/utils.ts
    - ceealar-pulse/middleware.ts
    - ceealar-pulse/app/api/import/route.ts
    - ceealar-pulse/app/api/import/priority/route.ts
    - ceealar-pulse/app/api/attendees/[id]/tags/route.ts
    - ceealar-pulse/app/api/attendees/[id]/tags/[tagId]/route.ts
commits:
  - d86ad43 "admin: operational stats, gaps list, sync health, force-sync-all"
  - 760d112 "attendees: inline priority editor on attendee and meeting pages"
  - 9372569 "security: harden auth callback, SSRF, link rendering, audit log, upload caps"
  - cae3ac7 "security: add CSP + security headers, drop unused prep_note column"
metrics:
  completed: "2026-05-17"
  duration: "~3 h working session"
  commits: 4
---

# Phase 10 — Admin Overhaul, Priority Editor, Security Pass

**One-liner:** Operational stats and editing affordances for admins, plus a full repo security review with the actionable findings shipped.

## Summary

Three logical chunks shipped in one continuous session, all on `main`:

1. **Admin page overhaul** — per-person meeting load, priority/category coverage, gaps list, oldest want-to-meets, calendar sync health, force-sync-all button.
2. **Inline priority editor** — clickable priority badge on attendee + meeting detail pages with popover picker, optimistic update, toast feedback.
3. **Security review + fixes** — see `Security Posture` section.

---

## 1. Admin Page Overhaul (commit d86ad43)

### What's new on `/admin` (in page order)

| Section | Source | Behaviour |
|---|---|---|
| Headline counts | `getStats()` in page.tsx | Attendees / team members / want-to-meet / scheduled (existing) |
| **Per-person load** | `getAdminOpStats()` → `perPerson` | 4 cards (one per team member) with mini bar chart across Fri 29 / Sat 30 / Sun 31, total + unscheduled count |
| **Priority coverage** | `priorityCoverage` | P5→P1 progress bars (covered / total). "Covered" = attendee has any non-cancelled meeting |
| **Category coverage** | `categoryCoverage` | Progress bars per `priority_category` (Funder, Peer Org, …) |
| **Gaps** | `gapsList` | Clickable list of every P5/P4 attendee with no meeting and no want-to-meet flag. Shows P-level chip + name + company + category |
| **Oldest want-to-meets** | `wantToMeetAging` | Top 10 want_to_meet rows by `created_at`, with days-old, owner name, links to meeting |
| **Calendar sync** | `syncHealth` | One row per team member. Status dot: grey (no URL) / red (error) / amber (stale >1h) / green. Includes `[SyncAllButton]` |
| Tags (existing) | `tagsWithCounts` | Tag count breakdown |
| Imports + export (existing) | unchanged | Attendees XLSX, priority XLSX, CSV export |

### Files

- **`lib/admin-stats.ts`** — Single function `getAdminOpStats()` does one pass over `team_members`, `meetings`, `attendees`, `user_ical_urls` and returns everything the new sections need. Conference days hard-coded as `CONFERENCE_DAYS` (May 29/30/31). "Active attendee" = appears in at least one non-cancelled meeting.
- **`app/api/admin/sync-all/route.ts`** — `POST` endpoint, bypasses the per-user 5-min throttle, iterates `user_ical_urls` rows that have a URL, calls `syncUserCalendar(user_id, url)` for each. Returns shape:
  ```ts
  { results: Array<{ user_id, name, created, promoted, updated, cancelled, unmatched, error_count }>, count: number }
  ```
  **Note:** `error_count` only — individual error strings are scrubbed (logged server-side via `console.error`). This was changed in commit 9372569 as part of H-4 from the security review.
- **`app/(app)/admin/_components/sync-all-button.tsx`** — Client component, calls the endpoint, shows per-user totals + error count in toast and inline table, calls `router.refresh()` on success.
- **`app/(app)/admin/page.tsx`** — Rewritten. Preserved existing import/export/tags sections, added the six new sections above, switched cards to `editorial-eyebrow` + `shadow-sm` styling for consistency with the rest of the polished app.

### Visual treatment used

- `MiniBars` inline component — flex column of div bars, height proportional to `max(p.byDay)` ceiling
- `ProgressBar` inline component — flat bar with coloured fill
- `PRIORITY_COLOURS` constant: P5 red → P1 grey
- All cards use `rounded-lg border border-border/60 bg-card shadow-sm`

---

## 2. Inline Priority Editor (commit 760d112)

### Behaviour

- Priority badge on attendee + meeting detail pages is now a popover trigger.
- Click → popover with 5 priority options (Critical/High/Medium/Low/Optional) + Clear.
- Empty state renders dashed "+ Priority" pill.
- Optimistic update (immediate visual change), toast on success/failure, `router.refresh()` to re-fetch server data.

### Files

- **`components/priority-editor.tsx`** — Client component using base-ui Popover from `@/components/ui/popover`. Calls `PATCH /api/attendees/{id}/priority` with `{ priority: 1|2|3|4|5 | null }`.
- **`app/api/attendees/[id]/priority/route.ts`** — Validates `priority` ∈ {1..5} ∪ {null}. Reads previous value, applies update via service-role admin client, **appends an audit row to `activity` table with `action: 'priority_changed'`** (the audit step was added in 9372569 as part of H-1).
- **Wired in:**
  - `app/(app)/attendees/[id]/page.tsx` — replaces `<PriorityBadge>` with `<PriorityEditor>`
  - `app/(app)/meetings/[id]/page.tsx` — same

### Caveat

`PriorityBadge` (the static read-only badge) still exists in `components/priority-badge.tsx` and is used in admin sparklines (`PRIORITY_LABELS` is exported from it). Don't delete it.

---

## 3. Security Review + Fixes (commits 9372569, cae3ac7)

A full security review was run by the Security Engineer agent (output captured in chat). Findings + dispositions below.

### Shipped fixes

| Finding | Severity | File(s) | What changed |
|---|---|---|---|
| **C-1** Auth callback domain check | Critical | `app/auth/callback/route.ts` | Strict case-insensitive match on email's domain part (not `.endsWith()`). Rejected users get `auth.users` row deleted via service-role to prevent accumulation. |
| **C-2** SSRF in iCal fetch | Critical | `lib/ical-sync.ts` `fetchICalText()` | `new URL()` parse, hostname allowlist (`calendar.google.com`), `redirect: 'manual'`, 5MB response cap. |
| **M-2** javascript: URI in attendee links | Medium | `lib/utils.ts` + 3 components | New `safeHttpUrl()` helper. Every render site of `attendee.linkedin` and `attendee.swapcard_url` now filters through it — `javascript:`/`data:` URIs return `null` and the link is suppressed. |
| **H-4** sync-all error leakage | High | `app/api/admin/sync-all/route.ts` | Response shape changed: `errors: string[]` → `error_count: number`. Details logged server-side via `console.error`. **Client button updated to match.** |
| **H-1** No audit trail on attendee mutations | High | priority + tags routes | Each priority change / tag add / tag remove now inserts an `activity` row with `action ∈ {priority_changed, tag_added, tag_removed}` and `detail` JSON. |
| **M-4** No upload caps | Medium | `app/api/import/route.ts`, `app/api/import/priority/route.ts` | 25MB / 10MB file caps, 5000 / 2000 row caps. |
| **Headers** | Info → Shipped | `middleware.ts` | CSP (default-src self, connect-src locked to Supabase host, object-src/frame-ancestors none, base-uri self), Referrer-Policy: same-origin, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Permissions-Policy denies camera/mic/geo/FLoC. Applied to every response including redirects. |
| **prep_note** | Low → Shipped | migration 0010 | Drops `meetings_view` + `meetings.prep_note` column. Historical data was still going out in `/api/export`. |

### Explicitly deferred (by user decision)

- **H-2** Admin role split — accepted: 4 trusted users, no admin tier needed.
- **H-3** `owner_id` ownership transfer in `PATCH /api/meetings/[id]` — accepted.
- **M-1** Raw DB error messages echoed to client — low value for internal-only app.
- **M-3** Centralize service-role admin client into `lib/supabase/admin.ts` with `import 'server-only'` — refactor with no security delta given current call sites are audited.
- **xlsx@0.18.5** Known CVEs (prototype pollution, ReDoS). Auth-gated to 4 trusted users. **Replace after the conference** (May 31) to avoid behaviour-change risk to the import path.
- **postcss<8.5.10** Build-time transitive via Next.js. Not runtime-reachable. No action.

### Operational items confirmed by user

- Migration 0010 applied in Supabase ✓
- MFA enabled on all 4 Google accounts ✓
- RLS verified enabled on every table in Supabase Table Editor ✓
- `SUPABASE_SERVICE_ROLE_KEY` lives only in Vercel env vars ✓

### CSP limitations (documented in `middleware.ts` source)

- `script-src 'unsafe-inline' 'unsafe-eval'` — required by Next.js hydration. Real defence comes from the other directives.
- `style-src 'unsafe-inline'` — Tailwind v4 + inline style attributes.
- If a future page needs an external script/iframe, the CSP will need updating. Browser console will show the exact directive being violated.

---

## Audit-trail conventions established this phase

The `activity` table now records non-meeting mutations too. The free-text `action` column accepts:

```
meeting_created
status_done
action_item_added
action_item_completed
priority_changed     ← new this phase, detail = { from, to }
tag_added            ← new this phase, detail = { tag_id }
tag_removed          ← new this phase, detail = { tag_id }
```

**If a future session adds attendee mutations (e.g. an attendee notes editor, strategic-context edits), keep the pattern:** read previous value, write change, append `activity` row with `actor_id`, `attendee_id`, descriptive `action`, and `detail` JSON capturing the diff. This is the recovery story for a compromised session.

The feed page (`/feed`) doesn't currently render `priority_changed` / `tag_added` / `tag_removed` rows — `describeActivity()` in `app/(app)/feed/page.tsx` falls back to "updated a meeting" for unknown actions. If you want these in the feed, extend the `switch` there.

---

## How a future session should pick up

1. **Skim** `.planning/STATE.md` first — has the always-current session log.
2. **For admin work**: `lib/admin-stats.ts` is the single source for ops queries. Extend it (don't create parallel queries) when adding stats.
3. **For attendee mutations**: copy the pattern in `app/api/attendees/[id]/priority/route.ts` — read previous, update, append `activity` row.
4. **For new server-side fetches of user-supplied URLs**: copy the SSRF defences from `lib/ical-sync.ts` `fetchICalText()` — `new URL()`, hostname allowlist, `redirect: 'manual'`, response cap.
5. **For new attendee-controlled link rendering**: use `safeHttpUrl()` from `lib/utils.ts`. Never render `<a href={attendee.someUserField}>` directly.
6. **For new headers/CSP changes**: edit `applySecurityHeaders()` in `middleware.ts`. It runs on every response.
7. **For new SQL**: next migration number is `0011_`. Apply via Supabase SQL Editor (no `supabase db push` in this project's workflow).
