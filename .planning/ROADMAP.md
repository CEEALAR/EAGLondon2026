# Roadmap: CEEALAR Pulse

**Milestone:** v1.0 — EAG London 2026
**Target:** 28 May 2026 (14 days from 2026-05-14)
**Phases:** 9 (Phase 0–8)
**Requirements:** 57 v1 requirements, 100% coverage ✓

## Overview

| # | Phase | Goal | Requirements | Target |
|---|-------|------|--------------|--------|
| 0 | Bootstrap | Deployed empty shell with live URL | BOOT-01–03 | 30 min |
| 1 | Auth + Shell | Google OAuth restricted to @ceealar.org + nav shell | AUTH-01–06 | 45 min |
| 2 | Attendees | XLSX import + virtualized browse + detail + strategic context | IMPORT-01–08, ATT-01–09 | 2 hrs |
| 3 | Meetings + Notes | Full meeting lifecycle from create to debrief | MEET-01–09 | 2.5 hrs |
| 4 | Tags + Filters | Tag system with custom colors + attendee filter | TAG-01–04 | 45 min |
| 5 | Schedule + Conflicts | Team 3-day timeline view + soft conflict warnings | SCHED-01–05 | 1 hr |
| 6 | Realtime + Feed | Live subscriptions + activity feed + optimistic UI | RT-01–05 | 45 min |
| 7 | Export + Polish | CSV export + PWA + notifications + skeleton/empty states | EXP-01–05 | 1 hr |
| 8 | Ship + Verify | Smoke test on real phones, README, production sign-off | SHIP-01–04 | 30 min |

---

### Phase 0: Bootstrap
**Goal:** Get a deployed Next.js 15 shell with a live Vercel URL — nothing more.
**Mode:** mvp
**Target time:** 30 minutes
**Requirements:** BOOT-01, BOOT-02, BOOT-03

**Success Criteria:**
1. `npx create-next-app@latest ceealar-pulse --typescript --tailwind --app --no-src-dir` runs clean
2. All dependencies installed: `@supabase/supabase-js @supabase/ssr xlsx date-fns lucide-react @tanstack/react-virtual`
3. shadcn/ui initialized; components added: button, input, card, badge, dialog, dropdown-menu, textarea, select, sheet, sonner, tabs, calendar, popover, checkbox
4. Home page renders "CEEALAR Pulse — coming online" in browser
5. Pushed to GitHub, connected to Vercel, `https://*.vercel.app` URL loads
6. **STOP: Share live URL with Attila before Phase 1 and collect: Supabase URL + anon key + service role key, Google OAuth client ID + secret**

---

### Phase 1: Auth + Shell
**Goal:** Sign in with Google (@ceealar.org only), upsert team member, show nav shell.
**Mode:** mvp
**Target time:** 45 minutes
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06

**Dependencies:** Supabase project URL + anon key, Google OAuth credentials from Attila

**Success Criteria:**
1. `/signin` page shows single "Continue with Google" button
2. Signing in with `attila@ceealar.org` redirects to app interior
3. Signing in with any non-@ceealar.org email shows rejection message; user is signed out
4. `team_members` row created on first sign-in (visible in Supabase table editor)
5. Bottom tab bar visible on 375px: Attendees · Meetings · Feed · Me
6. Top nav visible on desktop
7. Profile dropdown: avatar + name + sign-out
8. Sign-out redirects to `/signin`
9. **STOP: Ask Attila to run the Supabase migration SQL and confirm team_members works for all 4 accounts**

---

### Phase 2: Attendees
**Goal:** Import 1,904 attendees from Swapcard XLSX, virtualized browse with search/filter, detail with editable strategic context.
**Mode:** mvp
**Target time:** 2 hours
**Requirements:** IMPORT-01–08, ATT-01–09

**Dependencies:** Swapcard XLSX at `./data/swapcard.xlsx` (gitignored), migration applied

**Success Criteria:**
1. `/admin/import` drag-and-drop accepts `.xlsx` files
2. Parser skips rows 1–4, uses row 5 headers, imports from row 6
3. All 15 columns mapped; semicolons split to arrays; zero-width chars stripped
4. First import: ~1,904 inserted. Re-import: ~1,904 updated, 0 inserted
5. `/attendees` renders 1,904 rows without lag; DOM stays lightweight (TanStack Virtual)
6. Typing "Sarah" filters to matches within 200ms
7. Filter sheet opens and narrows list by selected criteria
8. `/attendees/[id]` shows all Swapcard fields for any attendee
9. "Why They Matter" edit persists after page refresh
10. "Schedule meeting" button present on detail (wired in Phase 3)

---

### Phase 3: Meetings + Notes
**Goal:** Full meeting lifecycle — create, prep, log notes, action items, status changes, activity writes.
**Mode:** mvp
**Target time:** 2.5 hours
**Requirements:** MEET-01–09

**Success Criteria:**
1. Meeting create dialog opens from attendee detail; owner dropdown defaults to current user
2. "Want to meet" creates meeting with `status='want_to_meet'` and no time required
3. `/meetings/[id]` shows attendee name, owner, status badge, time
4. Prep note hidden from non-owner when status ≠ 'done'; visible after status→done
5. Summary, Meeting Notes, Comments autosave on blur
6. Adding action item appears instantly; checking off marks it done
7. Status changer confirms before done/no-show/cancelled
8. Follow-up date picker saves and displays
9. `activity` table has rows after: create, status→done, action item add, action item complete

---

### Phase 4: Tags + Filters
**Goal:** Tag chips, create with color picker, multi-tag filter, tag management page.
**Mode:** mvp
**Target time:** 45 minutes
**Requirements:** TAG-01–04

**Success Criteria:**
1. Tag chips on attendee detail show name + color; X removes assignment
2. "Add tag" popover: typing shows matching tags; new name shows "Create new tag '...'" option
3. Color picker shows 8 swatches; custom color persists on tag
4. `/attendees` filter narrows correctly with multiple tags selected (AND)
5. `/me/tags`: rename and recolor work; delete disabled if tag has assignments
6. System tags (partner/alumni/funder/prospect) have no delete or rename option

---

### Phase 5: Schedule + Soft Conflicts
**Goal:** Three-day team timeline with soft conflict warnings.
**Mode:** mvp
**Target time:** 1 hour
**Requirements:** SCHED-01–05

**Success Criteria:**
1. `/meetings` shows three day tabs/columns: 29 May · 30 May · 31 May
2. Each day: hourly slots, meeting blocks positioned by time
3. Mobile: tabbed by team member; Desktop: 4-column grid
4. Tapping meeting block navigates to `/meetings/[id]`
5. Block colors: teal (planned), gold (done), muted (no-show/cancelled)
6. Attendee detail shows "⚠ Elisa also has a meeting with this person" when overlap exists
7. Meeting create shows "⚠ David has a want_to_meet for this person" (non-blocking)

---

### Phase 6: Realtime + Feed
**Goal:** Live sync across all four devices + activity feed + optimistic UI.
**Mode:** mvp
**Target time:** 45 minutes
**Requirements:** RT-01–05

**Success Criteria:**
1. Meeting created in tab A appears in tab B within 3 seconds (no refresh)
2. Action item checked in one session shows checked in another
3. `/feed` shows human-readable strings: "Attila scheduled a meeting with Sarah Chen for 30 May 14:00"
4. Feed groups by day; timestamps show "2h ago" / "yesterday"
5. Creating a meeting reflects in the UI before server confirms (optimistic)

---

### Phase 7: Export + Polish
**Goal:** CSV export, PWA, browser notifications, skeleton states, empty states.
**Mode:** mvp
**Target time:** 1 hour
**Requirements:** EXP-01–05

**Success Criteria:**
1. `/admin/export` downloads CSV with correct headers and ~1,904 rows
2. CSV includes: all Swapcard fields + CEEALAR strategic fields + tags + meeting count + last status + open action items
3. Adding to iOS home screen shows CEEALAR logo icon
4. With today's meeting scheduled: granting notification permission → notification fires 10 min before
5. All list views show skeleton during load
6. Empty attendee list shows "No attendees imported yet — visit /admin/import"
7. Empty meetings shows "No meetings yet — find someone in Attendees and tap 'Schedule meeting'"

---

### Phase 8: Ship + Verify
**Goal:** Production smoke test on real phones, README, four-team sign-off.
**Mode:** mvp
**Target time:** 30 minutes
**Requirements:** SHIP-01–04

**Success Criteria:**
1. Attila signs in on his phone — app loads, no console errors
2. Non-ceealar.org Google account → rejection message, redirected to `/signin`
3. Full smoke test: import → search → tag → schedule → notes → action items → mark done → export CSV
4. All four team members can sign in and see each other's schedule
5. `README.md` committed: live URL, sign-in instructions, env vars list, "if it breaks" section

---

## Milestone Definition of Done

All 8 phases complete. Four team members verify on 29 May at EAG London venue:

1. ✅ Sign in with @ceealar.org Google accounts
2. ✅ Search and filter 1,904 attendees in under a second
3. ✅ Mark "want to meet" in one tap from search results
4. ✅ Schedule a meeting with time + location in three taps
5. ✅ See each other's full three-day schedule
6. ✅ Get soft warning when two team members pursue same person
7. ✅ Take structured notes during a meeting
8. ✅ Add and check off action items
9. ✅ See real-time team activity feed
10. ✅ Get browser notification 10 min before scheduled meetings
11. ✅ Tag attendees with system + custom tags
12. ✅ Export everything to CSV after the conference

---
*Roadmap created: 2026-05-14*
*Last updated: 2026-05-14 after initialization*
