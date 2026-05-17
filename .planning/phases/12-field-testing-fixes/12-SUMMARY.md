---
phase: 12-field-testing-fixes
plan: "(none — direct work driven by user testing)"
subsystem: meetings, attendees, /me, scripts, design-system
tags: [field-testing, bugfix, ux, perf, codesplit, scripts, design-system]
dependency_graph:
  requires: [phase-10, phase-11]
  provides: [conference-ready-v2]
  affects: [/me, /attendees, /meetings/[id], realtime-provider, middleware, next-config, design-system]
tech_stack:
  added: []
  patterns:
    - "force-dynamic on user-specific routes (never serves stale)"
    - "staleTimes.dynamic=0 for the whole app (freshness > snappiness)"
    - "next/dynamic on owner-only + below-fold sections (code-split)"
    - "localStorage prefs persistence keyed by app version (pulse.attendees.prefs.v1)"
    - "FK-disambiguated team_members embed (!meetings_owner_id_fkey) everywhere"
    - "DB-state-aware mutation buttons (read existing row -> render add/remove)"
key_files:
  created:
    - ceealar-pulse/scripts/assign-priority-owners.mjs
    - ceealar-pulse/scripts/dedup-want-to-meets.mjs
  modified:
    - ceealar-pulse/app/(app)/meetings/[id]/page.tsx
    - ceealar-pulse/app/(app)/me/page.tsx
    - ceealar-pulse/app/(app)/attendees/_components/attendee-list.tsx
    - ceealar-pulse/app/(app)/attendees/_components/attendee-row.tsx
    - ceealar-pulse/app/(app)/attendees/_components/attendees-sidebar.tsx
    - ceealar-pulse/app/(app)/attendees/_components/attendee-actions.tsx
    - ceealar-pulse/app/(app)/attendees/[id]/page.tsx
    - ceealar-pulse/next.config.ts
external_repos_touched:
  - "CEEALAR/design-system @ 5112a35 — v0.3.0 release (palette aligned to Pulse)"
commits:
  - d7ca502 "perf: code-split owner-only and below-fold sections on /meetings/[id]"
  - 4dc6066 "script: assign-priority-owners — Top-50 Owner column → want_to_meet"
  - 03812fd "fix(me): force-dynamic so user-specific data never serves stale"
  - 5a89fd7 "attendees: persist query, filters, and sort across navigation"
  - d772318 "fix: want-to-meet button reflects DB state + drop client-cache staleness"
  - 2f462d9 "script: dedup-want-to-meets — collapse duplicate manual want_to_meet rows"
  - 36eb710 "fix(me): disambiguate team_members embed + add assignee pills/filter to /attendees"
metrics:
  completed: "2026-05-17 → 2026-05-18"
  duration: "~3 hours interactive (user testing + fixes)"
  commits: 7
  files: 10
---

# Phase 12 — Field Testing & Operational Polish

**One-liner:** Real-bug fixes and feature additions surfaced by hands-on user testing after Phase 11 shipped. Plus a cross-repo update to the CEEALAR design system.

## What happened, in narrative

1. **User ran the Top-50 priority XLSX** through a new one-off script to assign 26 attendees to Attila and Jonas as `want_to_meet` rows.
2. **User found 4 real bugs during testing** — chained, not independent:
   - The `Want to meet` button on the attendee page didn't know whether a row already existed, so clicks created duplicates.
   - The `/me` page sometimes showed stale data after mutations (client-side RSC cache).
   - More importantly: `/me` was returning **0 want-to-meets** even when 15 existed in the DB — turned out to be a PostgREST `PGRST201` ambiguous-embed error that the page swallowed silently.
   - Filter/sort selections on `/attendees` reset every time the user navigated away and came back.
3. **User requested two attendee-list features**: visible assignee pills on each row, and an "Assigned to" filter.
4. **User commissioned a design-system update**: pull Pulse's evolved palette and motion/effects layer back into `CEEALAR/design-system` so the system reflects the canonical production direction.

All shipped this phase.

---

## 1. Operational data scripts

### `scripts/assign-priority-owners.mjs` (commit 4dc6066)

Reads `CEEALAR Staff - Documents/5. Development & External Relations/CEEALAR_EAG_London_Top50.xlsx`, filters rows where the Owner column matches `attila` or `jonas`, and creates a `want_to_meet` meeting in Pulse for each match — owned by the right team_member, with a corresponding `meeting_members` row + `activity` row tagged `source: 'priority_import_owner_assignment'`.

- **Idempotent**: skips rows where a non-cancelled meeting already exists for that (owner, attendee) pair.
- **Dry-run by default**: `--apply` flag writes.
- **Owner map** is at the top of the file — extend to handle David / Greg / Elisa later by adding entries.
- **First run**: created 26 meetings (15 to Attila, 11 to Jonas) on 2026-05-17.

### `scripts/dedup-want-to-meets.mjs` (commit 2f462d9)

Cleans up duplicates created by the pre-fix `Want to meet` button. Groups `want_to_meet` rows by `(owner_id, attendee_id)`, keeps the oldest, flags any with content (notes / talking points / follow-up) for manual review rather than deleting them.

- **First run**: 5 duplicates removed for Attila × Michael Aird.
- **Safe to re-run any time** — idempotent.

Both scripts pull `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` and use the admin client to bypass RLS.

---

## 2. Bug fixes

### B-1. `/me` returned 0 rows due to ambiguous `team_members` embed (commit 36eb710)

**Symptom:** user signed in as `attila@ceealar.org`, DB had 15 want-to-meets owned by him linked via meeting_members, but `/me` rendered the empty state.

**Root cause:** Phase-3 query embedded `team_members(display_name)`. Migration 0004 added `meeting_members` as a second FK path from `meetings → team_members`, making the embed ambiguous. PostgREST throws `PGRST201` and returns `null` data — the page treated it as empty.

**Fix:** added the explicit FK hint `team_members!meetings_owner_id_fkey(display_name)`. Verified with a test query that the hinted version returns 15 rows where the un-hinted version returns 0.

**Lesson for future sessions:** any `meetings → team_members` embed in this codebase **must** use the FK hint. Grep `team_members(` (without the `!`) before merging — if you find one, it's wrong. Patterns in the codebase use `team_members!meetings_owner_id_fkey(...)` or `team_members!meeting_members_user_id_fkey(...)` depending on which relationship is meant.

### B-2. `Want to meet` button created duplicate rows (commit d772318)

**Symptom:** clicking the button on an attendee page showed a "Added" toast, button reverted to "Want to meet" after 2.2s, no persistent state. Repeated clicks silently duplicated rows.

**Root cause:** `AttendeeActions` had no awareness of existing rows — every click POSTed a new meeting.

**Fix:** `/attendees/[id]/page.tsx` now passes `existingWantToMeet: { id } | null` to the component. The button renders:
- **No existing row** → outline pill "Want to meet" (creates on click)
- **Has existing row** → teal-tinted pill "On your list" with checkmark (DELETEs on click after confirm)

### B-3. Client-side RSC cache served stale data (commit d772318)

**Symptom:** after creating a want-to-meet on an attendee page, navigating to `/me` via the bottom tab showed the pre-creation state for up to 60s.

**Root cause:** `next.config.ts` had `staleTimes.dynamic: 60` — Next 15's client-side router cache reuses the RSC payload for up to 60s when navigating via `Link`. `force-dynamic` controls server-side; client cache is independent.

**Fix:** set `staleTimes.dynamic: 0` (Next 15 default). For an internal coordination tool, freshness wins over navigation snappiness. Trade-off documented in the config file.

### B-4. `/me` was missing `force-dynamic` directive (commit 03812fd)

A separate fix from B-3 — `/me` was the only user-specific page without `export const dynamic = 'force-dynamic'`. Added.

---

## 3. New features

### F-1. Attendee filter/sort/query persistence (commit 5a89fd7)

`AttendeeList` now reads/writes preferences to `localStorage` under key `pulse.attendees.prefs.v1`:
- Search query
- Sort mode (name / priority)
- All filter selections (tags, priority, expertise, interests, career stage, country, seeking work, assigned-to)

Sets aren't JSON-serializable, so the persistence helpers round-trip them as arrays (see `filtersToJson` / `filtersFromJson` in `attendee-list.tsx`).

**Hydration order:** the load happens in a `useEffect` that runs after the first paint, gated by a `prefsLoaded` state flag. This keeps the SSR markup matching the initial client render (no hydration mismatch warnings).

**Versioned key (`.v1` suffix)** — bump to `.v2` if the FilterState shape changes in a breaking way.

### F-2. Assignee pills on attendee rows + "Assigned to" filter (commit 36eb710)

**Server side** (`attendees-sidebar.tsx`): fetches every active meeting (`status NOT IN (cancelled, no_show)`) joined with `meeting_members`, builds a `{ attendee_id: [user_id, ...] }` map of all assignees (owner ∪ members), passes to AttendeeList.

**Row rendering** (`attendee-row.tsx`): a new `assignees` prop carries `{ user_id, display_name, initials }[]` per row. Renders stacked colored initial chips on the right edge, max 3, with `+N` overflow chip. Color derived from a stable hash of `user_id` (4-color palette: teal, gold, indigo, pink).

**Filter** (`attendee-list.tsx`): new `assignedTo: Set<string>` filter dimension. UI: chip toggles per team_member in the filter sheet, between Priority and Tags. Active filter chip appears in the strip above the list. Persists to localStorage like the other filters.

---

## 4. Performance

### `next/dynamic` on `/meetings/[id]` (commit d7ca502)

Code-split four components on the meeting detail route:
- `EditMeetingButton` — owner-only dialog, non-owners never fetch the chunk
- `DeleteMeetingButton` — same
- `FollowUpDate` — carries `react-day-picker` (~30 kB)
- `AttendeeProfileSection` — below-fold

Each has a skeleton `loading` placeholder to avoid CLS. SSR is preserved (no `ssr: false`), so initial HTML still contains the content; only the JS hydration is deferred to a separate chunk.

**Reported First Load JS is essentially unchanged** (Next sums all SSR-eligible imports). Real wins:
- Non-owners skip dialog chunks entirely (~10-20 kB they don't download)
- Below-fold chunks load in parallel, not blocking above-fold paint
- Perceived LCP improves on cellular

**To revert:** change the four `dynamic(() => import(...))` calls back to direct `import { X } from './path'`.

---

## 5. Cross-repo: CEEALAR/design-system v0.3.0

Pushed directly to main of `CEEALAR/design-system` (commit 5112a35) — first cross-repo work this project.

**What changed:**
- Palette migrated from Canva-extracted v0.2 to Pulse-aligned v0.3:
  - `teal-700` **#018498 → #0F766E** (deeper, less saturated)
  - `gold-500` **#D1A75E → #D4A017** (warmer, more saturated)
  - `cream-50` **#FAF7F1 → #FAF7F0** (cosmetic)
- New tokens: `teal-deep`, `teal-soft`, `gold-deep`, `gold-soft`, `cream-deep`, `r-xl`, six-tier shadow scale, four gradients, six motion tokens.
- New file `effects-and-motion.css` with editorial utility classes Pulse evolved (`.editorial-h1`, `.editorial-eyebrow`, `.hr-editorial`, `.hero-header`, `.glass`, `.press`, `.lift`, `.fade-up`, `.stagger`). All animations respect `prefers-reduced-motion`.
- README rewritten with palette table, gradients, elevation, motion scale, editorial-utility API.
- Bumped to v0.3.0. README explicitly states "**web is canonical for digital surfaces**" — Canva sources may now drift.

**Pulse itself doesn't need updates from this** — Pulse's `globals.css` is where these values came from, so it already matches v0.3.

**For consumers of the design system** (e.g. future marketing site work): just re-pull both CSS files and continue using the same `var(--teal-700)` etc. Token names didn't change.

---

## State of the app entering 2026-05-18

- 26 priority attendees are tagged `want_to_meet` (15 Attila, 11 Jonas) and ready for Swapcard booking. iCal sync will promote them to `planned` as bookings come back.
- `/me` correctly shows everyone's want-to-meets again.
- Attendee list shows assignee pills, supports filter-by-assignee, persists filters.
- Meeting detail loads faster on cellular (code-split).
- Design system is the canonical reference for *digital* CEEALAR work.
- Conference is in 11 days.

---

## How a future session should pick up

1. **Read STATE.md first.**
2. **For any `meetings` query that joins `team_members`**: use an FK hint (`!meetings_owner_id_fkey` or `!meeting_members_user_id_fkey`). Anything without a hint is the B-1 bug waiting to happen.
3. **For new mutating buttons**: read existing state from server, render different UI for "doesn't exist" vs "exists" (the want-to-meet button pattern). Don't show a temporary "Added" state that reverts — that suggests transience.
4. **For new user-specific pages**: add `export const dynamic = 'force-dynamic'` at the top. We've now added it to `/me`, `/feed`, `/admin`; missed-on-create is the B-4 pattern.
5. **For one-off data ops on the live DB**: copy the pattern in `scripts/assign-priority-owners.mjs` — dry-run default, `--apply` flag, service-role admin client, idempotent (check for existing rows before insert).
6. **For new persisted UI prefs**: localStorage with versioned keys (`pulse.<area>.prefs.v<N>`). Round-trip Sets via arrays.
7. **For palette/motion/effect changes**: update **both** `ceealar-pulse/app/globals.css` and `CEEALAR/design-system/*.css` — they're now in sync at v0.3.

## Deferred (carry-overs from the senior-architect review, still relevant)

- Sentry / error reporting wiring (P1-1 from Phase 11)
- Supabase type generation (P1-4 from Phase 11)
- Concurrent-edit conflict UI for meeting notes (P1-5 from Phase 11)
- Replace `xlsx@0.18.5` post-conference
- Add Vitest unit tests on the pure-logic libs post-conference
