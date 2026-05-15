---
phase: 07-export-polish
plan: "03"
subsystem: ui-polish
tags: [skeleton, loading, empty-state, ux]
dependency_graph:
  requires: []
  provides: [EXP-04, EXP-05]
  affects: [attendees-page, meetings-page, feed-page]
tech_stack:
  added: []
  patterns: [next-loading-tsx, tailwind-animate-pulse, conditional-render-empty-state]
key_files:
  created:
    - ceealar-pulse/app/(app)/attendees/loading.tsx
    - ceealar-pulse/app/(app)/meetings/loading.tsx
    - ceealar-pulse/app/(app)/feed/loading.tsx
  modified:
    - ceealar-pulse/app/(app)/attendees/page.tsx
    - ceealar-pulse/app/(app)/meetings/page.tsx
decisions:
  - "Empty state rendered in Server Component page.tsx (not inside AttendeeList/MeetingsTimeline) to keep client components clean"
  - "HTML entity &lsquo;&rsquo; used for curly quotes in JSX to avoid linting issues"
  - "Link component from next/link used in Server Component pages for empty state navigation"
metrics:
  duration: "~10 min"
  completed: "2026-05-15"
  tasks: 2
  files: 5
---

# Phase 7 Plan 03: Skeleton States and Empty States Summary

**One-liner:** Next.js loading.tsx skeleton UIs with animate-pulse rows plus actionable empty states guiding users to /admin/import and /attendees when data is absent.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Skeleton loading states (loading.tsx files) | 85d97d5 | attendees/loading.tsx, meetings/loading.tsx, feed/loading.tsx |
| 2 | Empty states for attendees and meetings | 3aeede0 | attendees/page.tsx, meetings/page.tsx |

## What Was Built

### Task 1 — Skeleton loading states

Three `loading.tsx` files created using Next.js App Router convention. These are automatically used as Suspense fallbacks during page data fetching:

- **attendees/loading.tsx**: search bar skeleton (h-10) + 12 animated skeleton rows (h-[72px] each matching the actual virtualized row height), using `Array.from({ length: 12 })`
- **meetings/loading.tsx**: heading skeleton (h-7 w-32) + 3 day-tab skeletons (h-8 w-24 in flex row) + 4 meeting-block skeletons (h-16 w-full)
- **feed/loading.tsx**: heading skeleton (h-6 w-16) + 8 two-line activity row skeletons (h-4 w-3/4 primary line + h-3 w-20 timestamp line)

All use `animate-pulse bg-muted rounded` Tailwind classes. No `use client` directive (Server Components by default).

### Task 2 — Empty states

- **attendees/page.tsx**: When `attendees.length === 0`, renders centered empty state with "No attendees imported yet" and a teal `Link` to `/admin/import`
- **meetings/page.tsx**: When `meetings.length === 0`, renders centered empty state with "No meetings yet — Find someone in Attendees..." and a teal `Link` to `/attendees` labeled "Browse Attendees". The `Schedule` heading remains visible above the empty state.
- **feed/page.tsx**: Already had an empty state for `groups.length === 0` — no changes needed.

## Deviations from Plan

None — plan executed exactly as written. The feed page already had an empty state as documented in the plan context.

## Known Stubs

None — all empty states contain real, actionable copy with working navigation links.

## Threat Flags

None — skeleton and empty states introduce no new trust boundaries. The empty state copy revealing `/admin/import` is accepted per T-07-07 (all users are authenticated team members).

## Self-Check

- [x] `ceealar-pulse/app/(app)/attendees/loading.tsx` exists
- [x] `ceealar-pulse/app/(app)/meetings/loading.tsx` exists
- [x] `ceealar-pulse/app/(app)/feed/loading.tsx` exists
- [x] `ceealar-pulse/app/(app)/attendees/page.tsx` contains `attendees.length === 0` and `No attendees imported yet`
- [x] `ceealar-pulse/app/(app)/meetings/page.tsx` contains `meetings.length === 0` and `No meetings yet`
- [x] TypeScript: `tsc --noEmit` returns 0 errors
- [x] Commits 85d97d5 and 3aeede0 exist in git log

## Self-Check: PASSED
