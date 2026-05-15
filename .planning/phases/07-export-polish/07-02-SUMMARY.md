---
phase: 07-export-polish
plan: "02"
subsystem: notifications
tags: [browser-notifications, realtime, supabase, client-component]
dependency_graph:
  requires: []
  provides: [EXP-03]
  affects: [app/(app)/layout.tsx]
tech_stack:
  added: []
  patterns: [Browser Notification API, Supabase Realtime channel, setTimeout scheduling]
key_files:
  created:
    - ceealar-pulse/components/notification-provider.tsx
  modified:
    - ceealar-pulse/app/(app)/layout.tsx
decisions:
  - NotificationProvider uses self-contained Supabase Realtime subscription (not router dependency) for independent rescheduling
  - timerIds array is mutated in-place so cleanup closure always clears the latest set of timers
  - Permission requested fire-and-forget (.then not awaited) to avoid blocking initial render
metrics:
  duration: ~8 min
  completed: "2026-05-15"
  tasks_completed: 2
  files_modified: 2
---

# Phase 7 Plan 02: Browser Notification Provider Summary

**One-liner:** SSR-safe NotificationProvider that requests Notification API permission on mount and schedules setTimeout alerts 10 minutes before each of today's planned meetings, rescheduling on any Supabase Realtime meeting change.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | NotificationProvider component | 23c0d78 | ceealar-pulse/components/notification-provider.tsx |
| 2 | Wire NotificationProvider into app layout | d60c345 | ceealar-pulse/app/(app)/layout.tsx |

## What Was Built

**Task 1: NotificationProvider component**

Created `ceealar-pulse/components/notification-provider.tsx` — a `'use client'` component with two useEffects:

- Effect 1 (runs once): Requests Notification API permission via `Notification.requestPermission()` (fire-and-forget `.then()`) if permission is `'default'`.
- Effect 2 (runs once, self-contained): Subscribes to Supabase Realtime on the `meetings` table. On mount and on any INSERT/UPDATE/DELETE event, calls `scheduleNotifications()` which:
  1. Guards for `typeof Notification === 'undefined'` (SSR safety) and `Notification.permission !== 'granted'`
  2. Queries `meetings` table joining `attendees(first_name, last_name)` for today's date range, status `planned`, non-null `scheduled_at`
  3. For each meeting computes `msUntil10MinBefore`; skips meetings with `<= 0` (past or imminent)
  4. Schedules a `setTimeout` that fires a Browser Notification with attendee name and time string
  5. Tracks all timer IDs in a mutable array for cleanup

Cleanup: clears all setTimeout IDs and calls `supabase.removeChannel(channel)`.

**Task 2: Wire into app layout**

Updated `ceealar-pulse/app/(app)/layout.tsx` to:
- Import `NotificationProvider` from `@/components/notification-provider`
- Wrap existing `<RealtimeProvider>{children}</RealtimeProvider>` with `<NotificationProvider>` so children flow through both providers

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript: `npx tsc --noEmit` returns 0 errors (confirmed after each task)
- `typeof Notification === 'undefined'` guard present in both effects
- `Notification.permission !== 'granted'` guard inside `scheduleNotifications`
- Supabase query filters by `status eq 'planned'`, `gte`/`lte` for today's date range
- `setTimeout` called only when `msUntil10MinBefore > 0`
- Cleanup calls `clearTimeout` on all collected timer IDs and `removeChannel`
- Layout contains both `NotificationProvider` and `RealtimeProvider` imports and JSX
- No `any` types — cast via `as unknown as MeetingForNotif[]`

## Known Stubs

None.

## Threat Flags

No new security surface beyond what was modeled in the plan's threat_model (T-07-04, T-07-05, T-07-06).

## Self-Check: PASSED

- `ceealar-pulse/components/notification-provider.tsx` — exists (created, committed 23c0d78)
- `ceealar-pulse/app/(app)/layout.tsx` — modified (committed d60c345)
- Commits 23c0d78 and d60c345 verified in git log
