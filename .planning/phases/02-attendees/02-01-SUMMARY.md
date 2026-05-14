---
phase: 02-attendees
plan: "01"
subsystem: attendees-import
tags: [supabase, xlsx, import, types, rls, migration]
dependency_graph:
  requires: []
  provides:
    - attendees table DDL with RLS + GIN index + trigger
    - Attendee TypeScript type (22 fields)
    - POST /api/import multipart XLSX upsert endpoint
    - /admin/import drag-drop UI page
  affects:
    - Phase 2 Plans 02-02 (browse), 02-03 (detail) — both consume Attendee type and attendees table
tech_stack:
  added:
    - SheetJS (xlsx) — already installed, now used in import route
  patterns:
    - Service role client inline (createAdminClient from @supabase/supabase-js) for bulk upsert bypassing RLS
    - Dynamic header map from XLSX row 0 — no hardcoded column indices
    - Batched upsert (100 rows/batch) with pre-fetch to distinguish inserts from updates
key_files:
  created:
    - ceealar-pulse/supabase/migrations/0002_attendees.sql
    - ceealar-pulse/lib/types.ts
    - ceealar-pulse/app/api/import/route.ts
    - ceealar-pulse/app/(app)/admin/import/page.tsx
  modified:
    - ceealar-pulse/.gitignore — added data/ entry (T-02-01)
decisions:
  - Dynamic header map over hardcoded indices: resilient to Swapcard column reordering
  - Pre-fetch existing swapcard_urls before upsert to split insert/update counts without per-row queries
  - sanitize() as single source of truth for zero-width-space stripping and null normalization
  - Service role client inline (not from lib/supabase/server.ts) — anon key cannot bypass RLS for bulk write
metrics:
  duration: ~15 min
  completed: 2026-05-15
  tasks_completed: 3
  files_created: 4
  files_modified: 1
---

# Phase 2 Plan 01: Attendees Migration + XLSX Import Pipeline Summary

**One-liner:** Supabase attendees table with RLS/GIN/trigger, Attendee TS type, and SheetJS-based import route with drag-drop UI — complete foundation for all Phase 2 plans.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Supabase migration + TypeScript types | d6b1be2 | 0002_attendees.sql, lib/types.ts, .gitignore |
| 2 | POST /api/import route handler | 893b7cc | app/api/import/route.ts |
| 3 | Admin import UI page | 9c9b5ad | app/(app)/admin/import/page.tsx |

## What Was Built

### Task 1 — Supabase Migration + TypeScript Types

`0002_attendees.sql` creates `public.attendees` with 22 columns matching the Swapcard XLSX export:
- Core fields: `swapcard_url` (unique natural key), `first_name`, `last_name`, `company`, `job_title`, `career_stage`, `biography`, `expertise text[]`, `interests text[]`, `how_others_can_help`, `how_i_can_help`, `country`, `seeking_work boolean`, `recruitment`, `linkedin`
- Strategic context (shared/not per-user): `why_they_matter`, `how_to_engage`, `hypothesis`, `risks`, `collaboration_hooks`
- Timestamps: `created_at`, `updated_at` with auto-update trigger

RLS policies require `auth.uid() is not null` for select/insert/update. GIN index on name+company for full-text search. `update_updated_at()` trigger function + `attendees_updated_at` trigger.

`lib/types.ts` exports the `Attendee` type with all 22 fields, exactly mirroring the schema, for use by all Phase 2 plans.

### Task 2 — Import API Route (`POST /api/import`)

Auth-gated (401 without session). Parses multipart FormData, reads XLSX buffer via SheetJS, targets "Attendee Data" sheet with fallback to first sheet. Uses `range: 4` to start at row index 4 (header on row 5, data from row 6).

Three sanitization helpers:
- `sanitize()` — trims, strips zero-width spaces (U+200B), returns null for empty
- `splitArray()` — semicolon-split with per-element sanitize (expertise, interests)
- `seekingWork()` — 'yes'/'no' to boolean | null (case-insensitive)

Pre-fetches existing `swapcard_url` values, builds a Set, then splits rows into insert-count vs update-count before performing a single batched upsert. Batches of 100 via service role client. Returns `{ inserted, updated, skipped, errors }`.

### Task 3 — Admin Import Page (`/admin/import`)

Client component with four states: `idle` (drag-drop zone + click-to-browse), `uploading` (disabled button), `done` (counts card + reset button), `error` (message + retry button). Hidden file input triggered by clicking the drop zone via `useRef`. Gitignore warning visible in idle state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Security] Added `data/` to `.gitignore`**
- Found during: Task 1 (threat model T-02-01 check)
- Issue: `.gitignore` had no entry for `data/` directory; Swapcard XLSX would have been committable
- Fix: Added `data/` with explanatory comment to `ceealar-pulse/.gitignore`
- Files modified: `ceealar-pulse/.gitignore`
- Commit: d6b1be2

None other — plan executed as written.

## Threat Model Coverage

| Threat | Status |
|--------|--------|
| T-02-01 Information Disclosure (data/swapcard.xlsx) | Mitigated — data/ added to .gitignore; page shows warning |
| T-02-02 EoP (POST /api/import unauthenticated) | Mitigated — getUser() check returns 401 if no session |
| T-02-03 Tampering (XLSX cell values) | Mitigated — sanitize() strips ZW spaces; no dangerouslySetInnerHTML |
| T-02-04 Tampering (mass upsert) | Accepted — last-write-wins per plan disposition |

## Known Stubs

None — no placeholder data, hardcoded empty values, or TODO markers in the delivered files.

## Self-Check: PASSED

All four files exist on disk. All three task commits (`d6b1be2`, `893b7cc`, `9c9b5ad`) confirmed in git history. TypeScript compiles with no errors.
