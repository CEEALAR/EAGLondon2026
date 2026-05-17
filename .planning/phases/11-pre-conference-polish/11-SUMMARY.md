---
phase: 11-pre-conference-polish
plan: "(none — direct work from senior-architect review)"
subsystem: error-handling, ux, performance, polish
tags: [error-boundary, offline, optimistic-ui, debounce, skeletons, lint]
dependency_graph:
  requires: [phase-10]
  provides: [pre-conference-ready]
  affects: [global-layout, signin, realtime, meetings, action-items, /me]
tech_stack:
  added: []
  patterns:
    - "root app/error.tsx for global error boundary"
    - "optimistic-with-rollback (read prev, mutate, fetch, on-failure setState(prev) + toast)"
    - "leading-edge debounce on realtime refresh"
    - "next/image with remotePatterns for Google avatars"
key_files:
  created:
    - ceealar-pulse/app/error.tsx
    - ceealar-pulse/app/not-found.tsx
    - ceealar-pulse/app/(app)/me/loading.tsx
    - ceealar-pulse/app/(app)/admin/loading.tsx
    - ceealar-pulse/app/(app)/meetings/[id]/loading.tsx
    - ceealar-pulse/app/(app)/attendees/[id]/loading.tsx
    - ceealar-pulse/components/offline-banner.tsx
    - ceealar-pulse/.nvmrc
  modified:
    - ceealar-pulse/app/(app)/layout.tsx
    - ceealar-pulse/app/(app)/me/page.tsx
    - ceealar-pulse/app/(app)/meetings/[id]/_components/action-items-section.tsx
    - ceealar-pulse/app/(app)/meetings/_components/meetings-timeline.tsx
    - ceealar-pulse/app/(app)/meetings/_components/meetings-sidebar.tsx
    - ceealar-pulse/app/(auth)/signin/page.tsx
    - ceealar-pulse/components/realtime-provider.tsx
    - ceealar-pulse/components/nav/profile-dropdown.tsx
    - ceealar-pulse/middleware.ts
    - ceealar-pulse/next.config.ts
commits:
  - 180aaba "pre-conference polish: P0/P1/P2/P3 from senior-architect review"
metrics:
  completed: "2026-05-17"
  duration: "~90 min focused work"
  commits: 1
  files: 18
---

# Phase 11 — Pre-Conference Polish (P0/P1/P2/P3 from Senior-Architect Review)

**One-liner:** Final hardening pass before the May 29 conference. Ships error boundary + offline UX + optimistic-rollback pattern + realtime debounce + skeletons + post-conference countdown + clean lint.

## What changed and why

### P0 (ship-blocker before May 29)

| Fix | File | Why it matters at the conference |
|---|---|---|
| Root `error.tsx` | `app/error.tsx` | A single uncaught error in `RealtimeProvider`, `getUnreadFeedCount`, or `CalendarAutoSync` would white-screen all 4 users with no recovery. Now they see a "Try again" button. |
| `/me/loading.tsx` skeleton | `app/(app)/me/loading.tsx` | `/me` is the post-auth landing for users with no calendar yet. Multiple parallel Supabase reads = blank screen on cellular for 1-3s. |
| `OfflineBanner` | `components/offline-banner.tsx` mounted in `app/(app)/layout.tsx` | Conference WiFi drops. Before: silent fetch failures. After: top amber bar via `navigator.onLine` events. |
| Action-items optimistic rollback | `action-items-section.tsx` | Toggle/delete/add now wrap in try/catch, revert state, and toast on failure. Previously: silent data loss on flaky 4G — checkbox stayed flipped but DB didn't update. |
| Find-time `duration_minutes` | `meetings-timeline.tsx` + `meetings-sidebar.tsx` | `findFreeSlots` was hardcoded to 30-min slots. Added `duration_minutes: number \| null` to `TimelineMeeting`, included it in the meetings select, fall back to `DEFAULT_MEETING_MIN` (30) if null. Real schedules with 45/60/90-min meetings now produce correct mutual-free calculations. |

### P1

| Fix | File | Why |
|---|---|---|
| Realtime debounce | `components/realtime-provider.tsx` | A burst of changes (10 inserts from an iCal sync, or 4 simultaneous edits in a busy block) was firing 10 `router.refresh()` calls, each re-running every server query. Now coalesced to one refresh per 2s window, leading-edge so a single edit still feels instant. |
| Middleware matcher | `middleware.ts` | The 89.4 kB auth+CSP middleware was running on `manifest.webmanifest`, `.ico`, `robots.txt`, `sitemap.xml` requests. Added them to the negative-lookahead exclusion. |

### P2 (polish)

- **Leaf-route skeletons** for `/admin`, `/meetings/[id]`, `/attendees/[id]` — `/me/tags` deferred (lower traffic).
- **`useMemo` dep wrap** on `dayData` (line 402 of `meetings-timeline.tsx`) — clears the only remaining React Hooks exhaustive-deps lint warning.
- **`<img>` → `<Image>`** for Google avatars in `TopNav` and `/me` profile card. Added `images.remotePatterns: [{ hostname: 'lh3.googleusercontent.com' }]` to `next.config.ts`. Used `unoptimized` since they're tiny and don't benefit from Vercel's image optimization pipeline.
- **Sign-in countdown** now has three explicit phases (`pre` / `live` / `post`). Post-conference state shows "EAG London 2026 · Sign in to wrap up notes". Tick frequency dropped from 1s to 30s (saves ~60× the React renders, no visible difference).
- **Empty-state copy** normalized to format: `"No X yet — [why or what to do]."` Applied to `/me` action items, `/me` want-to-meets, action-items section. Existing instances on feed and admin already matched the format.

### P3

- **`.nvmrc`** pins Node 22 to match CI.
- **`app/not-found.tsx`** custom 404 styled to match the app (editorial-h1, teal CTA buttons to /attendees and /feed). Default Next.js 404 leaked framework branding.

## Build impact

- Lint: 3 warnings → **0 warnings**.
- Build: clean, all 18 routes generate.
- Bundle sizes: unchanged in any meaningful way (shared First Load still 102 kB).
- New routes don't add any first-load JS — they're either RSC-only (`error.tsx`, `not-found.tsx`, `loading.tsx`) or tiny client components.

## Patterns established (use these for new code)

### Optimistic-with-rollback for mutating client components

```tsx
async function mutate(...) {
  const prev = items
  setItems(applyOptimistically)
  try {
    const res = await fetch(...)
    if (!res.ok) throw new Error(await res.text())
  } catch (e) {
    setItems(prev)
    toast.error(e instanceof Error ? e.message : 'Could not save')
  }
}
```

Apply to any new mutating UI: tag add/remove, meeting notes save, member assignment. The priority editor (Phase 10) and action items (Phase 11) follow this; meeting notes form does not yet (deferred — uses autosave with debounce; conflict story is P1-5 in the review for post-conference).

### Loading skeleton shape

Match the page's hero+body structure with `animate-pulse bg-muted rounded` blocks. Reuse `rounded-lg border border-border/60 bg-card shadow-sm` containers so the skeleton frame matches the real frame and there's no layout shift on hydration.

### Realtime debounce pattern

If you add a new realtime channel, use the same leading-edge cooldown ref pattern in `realtime-provider.tsx`. Don't fire on every event.

## Items from the review NOT shipped (and why)

- **P1-1 Sentry** — needs external API key + DSN config. Defer to user.
- **P1-4 Supabase type generation** — partial fix shipped (`duration_minutes` added to `TimelineMeeting`); full `supabase gen types` setup deferred (needs `supabase` CLI + project-id env).
- **P1-5 Concurrent edit conflict UI** — significant feature work (~30 min, would touch `meeting-notes-form.tsx`). Deferred — accepted last-write-wins for now per Phase 10 rationale (4 trusted users).
- **P2-3 Code-split `/meetings/[id]`** — would shave 30-40 kB off the 201 kB route. Behaviour-change refactor; not worth pre-conference risk.
- **P3 Prettier** — full-tree reformat would balloon the diff. Defer.
- **P3 Audit-log on meeting notes/comments** — sensible extension of the activity table but would touch the autosave path. Defer.

## For a future session

1. Optimistic mutations: copy the rollback pattern above. Don't merge a new `fetch().method('PATCH')` without it.
2. New routes: add a `loading.tsx` sibling. Pattern in any of the four shipped this phase.
3. Avatar/external images: extend `next.config.ts` `images.remotePatterns` if a new host is needed.
4. Empty-state copy: `"No X yet — [actionable hint]."` always.
5. Post-conference: revisit P1-1 (Sentry), P1-4 (type-gen), P1-5 (conflict UI), P2-3 (code-split), and the Vitest plan from Phase 10's Testing & CI section.
