---
phase: 05-schedule-conflicts
created: 2026-05-15
---

# Phase 5 Context: Schedule + Soft Conflicts

## Goal
Three-day team schedule view with soft conflict warnings.
Conference dates: 29 May, 30 May, 31 May 2026.

## Design decisions

### Timeline layout
- Hours: 08:00–21:xx (HOUR_START=8, HOUR_END=22)
- 60px per hour → 1px per minute → 30px meeting block height (exactly 30 min)
- Time labels left (28px), meeting blocks offset right
- Mobile: day tabs + member pill tabs → single-lane scroll
- Desktop: day tabs + 4-column grid (one per team member)

### Status colors
- planned: #0F766E (brand teal)
- done: #D4A017 (brand gold)
- want_to_meet (scheduled): gray-100 border
- no_show/cancelled: muted bg

### Only scheduled meetings shown in timeline
Meetings with null scheduled_at (pure want_to_meet) are not shown in the timeline — they have no time position.

### Conflict detection (server-side)
SCHED-04 and SCHED-05 both derive from the meetings array already fetched on the attendee detail page. No additional API calls needed. The data is server-side computed and passed as props.

### No DB migration
Phase 5 requires no new tables. All schedule data is in the existing meetings table.

## Wave structure
- Wave 1 (05-01): Timeline view — MeetingsTimeline component + /meetings page update
- Wave 2 (05-02): Conflict banners — attendee detail + meeting create dialog
