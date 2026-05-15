# Project State: CEEALAR Pulse

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-14)

**Core value:** Four CEEALAR team members can find, tag, schedule, and debrief any of 1,904 attendees from their phones with one hand while walking between sessions — no spreadsheet required.
**Current focus:** Phase 4 — Tags + Filters

## Current Phase

**Phase 4: Tags + Filters**
- Status: Not started
- Goal: Tag chips, create with color picker, multi-tag filter, tag management page
- Next action: Run /gsd-plan-phase 4

## Phase History

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 0: Bootstrap | Complete ✓ | 2026-05-14 |
| Phase 1: Auth + Shell | Complete ✓ | 2026-05-14 |
| Phase 2: Attendees | Complete ✓ | 2026-05-15 |
| Phase 3: Meetings + Notes | Complete ✓ | 2026-05-15 |
| Phase 4: Tags + Filters | Not started | — |
| Phase 5: Schedule + Conflicts | Not started | — |
| Phase 6: Realtime + Feed | Not started | — |
| Phase 7: Export + Polish | Not started | — |
| Phase 8: Ship + Verify | Not started | — |

## Blocked On

Nothing — Phase 3 complete (pending UAT), proceeding to Phase 4.

## Pending User Actions (before Phase 4)

- [ ] Run Supabase migration `ceealar-pulse/supabase/migrations/0003_meetings.sql` in Supabase SQL editor
- [ ] Complete Phase 3 UAT (03-HUMAN-UAT.md) — 9 browser tests

## Live URLs

- **App:** https://eag-london2026.vercel.app/
- **GitHub:** https://github.com/CEEALAR/EAGLondon2026

## Key Env Vars

```
NEXT_PUBLIC_SUPABASE_URL=https://cjjlctmdfbvutjtoxagm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<set in Vercel>
SUPABASE_SERVICE_ROLE_KEY=<set in Vercel — server-side only>
```

Google OAuth configured in Supabase Auth dashboard (not env vars).

## Decisions Made

- Next.js 15 App Router with TypeScript and Tailwind CSS v4 (Plan 00-01)
- DM Sans for body, Playfair Display italic for accent — no Geist fonts (Plan 00-01)
- Brand colors as CSS custom properties: --color-teal #0F766E, --color-gold #D4A017, --color-cream #FAF7F0 (Plan 00-01)
- Supabase SDK pre-installed but no client configured in Phase 0 — env vars deferred to Phase 1 (Plan 00-01)
- Service role client created inline in callback route with empty cookie store — RLS has no INSERT policy on team_members (Plan 01-01)
- PKCE flow accepted as CSRF protection for OAuth (Supabase default) (Plan 01-01)
- useSearchParams wrapped in Suspense boundary — required by Next.js 15 static generation (Plan 01-01)
- ProfileField extracted as inline helper component (not separate file) to DRY 11 profile field renders (Plan 02-03)
- StrategicContextForm uses per-field savedField state (string | null) for per-field Saved indicator (Plan 02-03)
- notFound() called immediately on null attendee for correct 404 handling of invalid UUIDs (Plan 02-03)
- Expertise chips hidden on mobile (sm:hidden) to give name/company room in 72px rows (fix post-02-02)
- StrategicContextForm Saved indicator shown optimistically (before await) — React 19 async state timing (fix post-02-03)
- Import skips 91 rows with blank swapcard_url — these are incomplete/internal Swapcard accounts, expected (Phase 2 UAT)
- meetings_view encodes prep_note privacy as SQL CASE (owner OR done) — no application-layer leakage (Plan 03-01)
- MeetingCreateDialog controls open state via useState + Button onClick (not DialogTrigger asChild — not typed in this shadcn version) (fix post-03-01)
- Status transitions to done/no_show/cancelled gated by window.confirm — simple, no modal library needed (Plan 03-01)
- Action items use optimistic local state — setItems before fetch to feel instant on mobile (Plan 03-01)
- Service role admin client used in all API writes — anon client for reads (RLS enforced) (Plan 03-01)

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 00-bootstrap | 00-01 | ~30 min | 2 | 20+ |
| 01-auth-shell | 01-01 | ~12 min | 3 | 8 |
| 01-auth-shell | 01-02 | ~15 min | 3 | 5 |
| 02-attendees | 02-01 | ~15 min | 3 | 4 |
| 02-attendees | 02-02 | ~15 min | 3 | 3 |
| 02-attendees | 02-03 | ~15 min | 2 | 2 |
| 03-meetings | 03-01 | ~12 min | 3 | 16 |

---
*State initialized: 2026-05-14*
*Last session: 2026-05-15 — Completed Phase 3 (Meetings + Notes). Full meeting lifecycle: create dialog, /meetings/[id] detail, notes autosave, action items, status changer, follow-up date picker, activity writes. 9/9 automated checks pass; 9 browser tests pending UAT.*
*Stopped at: Phase 4 (Tags + Filters) — run /gsd-plan-phase 4 after applying 0003_meetings.sql migration*
