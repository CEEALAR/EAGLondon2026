# CEEALAR Pulse

## What This Is

A phone-first, real-time team networking CRM for four CEEALAR staff attending EA Global London 2026 (29–31 May). The tool lets the team search 1,904 conference attendees, coordinate meetings, take structured notes, tag contacts, and see each other's activity in a live feed — all from their phones at the conference venue. Built to be deployed and battle-tested before the conference opens on 29 May.

## Core Value

Four CEEALAR team members can find, tag, schedule, and debrief any of 1,904 attendees from their phones with one hand while walking between sessions — no spreadsheet required.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Google OAuth sign-in restricted to @ceealar.org domain
- [ ] Virtualized attendee list (1,904 rows, no pagination) with live search and multi-facet filters
- [ ] XLSX import from Swapcard with upsert and progress reporting
- [ ] Attendee detail with inline-editable CEEALAR strategic context (autosave on blur)
- [ ] Tag system (4 system tags + custom tags with color picker)
- [ ] Meeting creation with owner, status, time, location; "want to meet" quick action
- [ ] Meeting detail with prep note (owner-private until done), log sections, action items
- [ ] Three-day timeline view of all team meetings with soft conflict warnings
- [ ] Supabase Realtime subscriptions with optimistic UI
- [ ] Activity feed (reverse-chronological, grouped by day)
- [ ] CSV export of all attendees with CEEALAR data + meeting summary
- [ ] PWA manifest for add-to-home-screen
- [ ] Browser notification 10 min before scheduled meetings
- [ ] Skeleton and empty states throughout

### Out of Scope

- Dark mode — not requested, adds complexity
- Email notifications — brief says browser notifications only
- Google Calendar sync / ICS export — team will copy/paste if needed
- Pagination of attendee list — must virtualize
- User roles / admin roles — four equal users
- Unit tests, integration tests, e2e tests — explicitly excluded by brief
- CI/CD beyond Vercel defaults — not needed
- Redux, Zustand, tRPC, Prisma — stack is locked
- Storybook, ESLint plugins, Prettier configs, Husky — no ceremony
- Real-time collaborative editing conflicts — last-write-wins acceptable at this scale
- Internationalization — English only
- Invite flow — hard-code the four @ceealar.org emails if faster

## Context

CEEALAR is a UK charity running a residential AI-safety incubator in Blackpool. EAG London 2026 is the organization's rebrand-and-relaunch moment. The four team members are:
- Attila Ujvari (ED) — attila@ceealar.org
- Elisa Paka (Director of Programming) — elisa@ceealar.org
- David Staley (Operations Manager) — david@ceealar.org
- Jonas (long-term volunteer) — jonas@ceealar.org

The Swapcard attendee export contains 1,904 rows. Headers are on row 5, data starts row 6. Fields include semicolon-delimited expertise/interest arrays and a canonical Swapcard URL used as the natural key for upsert. Names sometimes contain zero-width spaces (U+200B) — sanitize with `.trim().replace(//g, '')`.

Brand: DM Sans body, Playfair Display italic for one accent per screen, teal-700 primary (#0F766E), gold-500 accent (#D4A017), cream-50 background (#FAF7F0). Design system at https://github.com/CEEALAR/design-system (fallback: Google Fonts + hex values if repo unavailable).

## Constraints

- **Timeline**: Must be working and dogfooded by 28 May — 14 days from project start (14 May 2026)
- **Users**: Exactly 4, all @ceealar.org — no invite flow needed
- **Tech stack**: Locked. Next.js 15 App Router, Tailwind, shadcn/ui, Supabase (Postgres + Auth + Realtime), Vercel, TanStack Virtual, SheetJS, date-fns, lucide-react
- **Cloud infra**: Attila provisions Supabase + Google OAuth + GitHub + Vercel — Claude does not provision infrastructure
- **Budget**: Supabase free tier + Vercel hobby — no paid add-ons without explicit approval
- **Mobile-first**: Build at 375px first. Every screen must be usable one-handed on a phone.
- **Data sensitivity**: Swapcard XLSX and any exported CSVs are gitignored. Never committed.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase client directly (no ORM) | Brief explicitly forbids Prisma; keeps bundle small | — Pending |
| Hard-code 4 user emails if needed | Faster than building invite flow for known users | — Pending |
| TanStack Virtual for attendee list | 1,904 rows would destroy DOM performance without virtualization | — Pending |
| `meetings_view` Postgres view for prep_note RLS | Simplest way to hide private field without complex RLS policies | — Pending |
| Owner-only `update`/`delete` on meetings/action_items | Brief specifies; status field team-editable as exception | — Pending |
| Zod for form validation (optional) | Claude's call — use if it speeds up forms, otherwise HTML constraints | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-14 after initialization*
