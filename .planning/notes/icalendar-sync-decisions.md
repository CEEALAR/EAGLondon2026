---
title: iCalendar Sync Design Decisions (Phase 9)
date: 2026-05-17
context: Exploration session before /gsd:plan-phase 9 — captures the *why* behind each decision so the planner doesn't re-litigate them.
---

# iCalendar Sync — Design Decisions

These were settled in a Socratic exploration with Attila on 2026-05-17. Phase 9 spec in ROADMAP.md should be treated as authoritative; this note explains the reasoning.

## 1. Source-of-truth split: calendar wins on time, Pulse owns the rest

**Decision:** iCal owns `scheduled_at`, `location`, `duration_minutes`. Pulse owns `status`, notes, action items, members, tags.

**Why:** Conference 1:1s get rescheduled constantly via Swapcard during the event. If Pulse owned time, every reschedule would require manual re-entry — exactly the friction we're trying to eliminate. But debrief notes, action items, and team-level metadata (who else is coming, what tags apply) only live in Pulse and must not be wiped by a re-sync.

**Rejected alternatives:**
- *Calendar as sole source of truth*: would re-sync everything, blowing away notes. Unacceptable.
- *Calendar as one-time seed*: ignores reschedules. Defeats the purpose.

## 2. Disappeared events → mark `cancelled`, never delete

**Decision:** If a previously-synced iCal event is no longer present in the feed, set the Pulse meeting's status to `cancelled`. Preserve the row.

**Why:** Notes and action items survive even after a meeting is cancelled. Deleting cascades would destroy team-level work product. Also: the `cancelled` status already excludes meetings from active counts (admin page filter from 2026-05-17).

## 3. Title parsing: only `Meet *` events, single attendee

**Decision:** Filter iCal events to those whose title starts with `Meet ` (case-insensitive, with word boundary). Strip the prefix → remainder is the candidate name. Assume one attendee per event.

**Why:** Swapcard's auto-generated calendar entries follow this convention (confirmed by Attila with example iCal feed). Non-`Meet` events (talks, lunch, breaks) are not 1:1s and shouldn't become Pulse meetings.

**Rejected alternative:** Multi-attendee parsing ("Meet Sasha & Pete") was considered, but Attila confirmed Swapcard never produces these. Avoided a schema change to `meeting_attendees` that would have rippled through every UI surface.

**Stays single-attendee per event** — multi-CEEALAR-per-meeting (already handled via `meeting_members`) covers the other axis.

## 4. Merge with existing `want_to_meet`: promote, don't duplicate

**Decision:** If iCal imports "Meet Sasha" and an existing `want_to_meet` for Sasha already exists in Pulse, promote that record (set `scheduled_at`, change status to `planned`, attach `ical_uid`). Do not create a duplicate.

**Why:** The existing want_to_meet may carry prep notes, the colleague who flagged it, original timestamp — all worth preserving. One Pulse meeting per attendee-encounter is also less cluttered.

**Edge:** If there are multiple want_to_meets for the same attendee owned by different CEEALAR users, promote the one belonging to the user whose iCal triggered the sync. The others stay as want_to_meet.

## 5. Ambiguous and unmatched events → `/me` "Unmatched events" tray

**Decision:** Events where the parsed name matches zero or more than one attendee land in a per-user tray on `/me`. User picks the right attendee (or dismisses). Nothing is created until resolved.

**Why:** Silent skip loses meetings (Swapcard may have an attendee under a nickname or alt spelling). Auto-creating a placeholder pollutes `/meetings` with unresolved rows during the conference. The tray is the explicit-action middle ground.

## 6. Per-user iCal feed, stored on `user_ical_urls`

**Decision:** Each of the four CEEALAR team members pastes their personal Swapcard iCal URL on `/me`. Stored as a single row per user in `user_ical_urls(user_id, url, created_at, last_synced_at)`.

**Why:** Each Swapcard user gets a different secret iCal URL — a shared feed would lose the per-user 1:1 mapping. Storing one row per user keeps the model simple and per-user revocation trivial (`DELETE WHERE user_id = ...`).

**Security:** iCal URLs contain a secret token. Never log them. Cron job uses service-role client; user-facing endpoints check `auth.uid() = user_id` before read.

## 7. Multi-CEEALAR overlap: separate meetings, rely on soft conflict warning

**Decision:** If Attila and David both have "Meet Sasha 14:00" in their separate iCals, create two Pulse meetings (one per owner). The existing soft-conflict warning on the attendee detail page surfaces the overlap. Manual merge available via `meeting_members`.

**Why:** Auto-merging would require heuristics (same attendee + same start time = same meeting?) that can produce wrong answers — they might have coincidentally booked separate 1:1s with Sasha at the same time. Two meetings + an explicit conflict warning lets the team decide.

## 8. Refresh cadence: Vercel cron every 5 min during conference + manual button

**Decision:** Vercel cron job hits every connected iCal every 5 minutes from 09:00–22:00 BST, Thu 28 May – Sat 31 May 2026. Manual "Sync now" button always available.

**Why:** Page-load polling was the initial choice (simplest), but Attila revised it — 5-minute auto-poll catches new Swapcard bookings without anyone needing to open the app. The cost is one cron entry; the benefit is the team can trust Pulse without ritualistic refreshing.

**Out of scope for v1:** webhooks (Google Cal doesn't push for iCal feeds anyway).

## 9. Onboarding UX: a guided 3-step flow on `/me`

**Decision:** Empty state shows three illustrated steps:
1. Toggle "Sync to my Google Calendar" in Swapcard settings
2. Locate the auto-created Swapcard calendar under "Other calendars" in Google Calendar
3. Get the secret iCal URL from "Settings and sharing"

**Why:** The setup chain involves two third-party UIs and is non-obvious. Without guidance, half the team won't make it through. The "Test sync" preview before save further reduces the risk of pasting a wrong URL silently.

## 10. iCal UID for stable identity

**Decision:** Store the `UID` field of each iCal VEVENT on the meeting row (new column `ical_uid`, unique nullable). Use it as the dedupe key on re-syncs.

**Why:** iCal UIDs are stable across syncs even if the title or time changes. Without them, we'd have to fuzzy-match on (attendee + start time), which fails on reschedules.

---

## Open questions for planning phase (not blocking)

- Picker UX inside the "Unmatched events" tray — search box that filters all 1,972 attendees? Or pre-filter by partial name match?
- What happens to a meeting whose iCal UID changes? (Google Cal might re-issue under some circumstances.) — treat as new event + soft-warn user.
- Cron auth — Vercel cron headers + a shared secret env var. Standard pattern.
- Time zone — Swapcard events come through in UTC or BST? Verify against the sample feed before parsing.
