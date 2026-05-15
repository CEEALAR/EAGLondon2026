---
phase: 06-realtime-feed
created: 2026-05-15
---

# Phase 6 Context: Realtime + Feed

## Goal

Live sync across all four devices + activity feed.

## Design decisions

### Realtime approach: router.refresh()

The app layout is a Server Component — Realtime must be implemented in a Client Component wrapper.
RealtimeProvider subscribes once on mount using the browser Supabase client.
On any change event (INSERT/UPDATE/DELETE), calls router.refresh() which re-fetches all server-rendered data.
This is the standard Next.js App Router + Supabase Realtime pattern. Simple, no manual cache invalidation needed.

### Single subscription channel

One Supabase channel ('app-realtime') subscribes to 3 tables (meetings, action_items, activity).
Any table change refreshes the whole page. Acceptable for a 4-person internal tool with infrequent writes.

### Feed: server component

/feed is a Server Component — data is fresh on every render triggered by router.refresh().
The RealtimeProvider's router.refresh() call re-renders /feed when new activity rows are inserted.
Last 100 rows is sufficient for a 3-day conference.

### RT-05: optimistic UI

Already satisfied by prior phases:
- Phase 3: action item add/toggle/delete (optimistic), notes "Saved" indicator (optimistic)
- Phase 4: tag chip assign/remove (optimistic)

No additional optimistic UI is introduced in Phase 6. The RealtimeProvider makes all server-rendered
data live across tabs and devices, complementing the existing per-operation optimistic updates.

### No DB migration

All required tables (activity, meetings, action_items) exist from Phase 3.
Phase 6 is purely application-layer work.
