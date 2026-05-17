# Project State: CEEALAR Pulse

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-14)

**Core value:** Four CEEALAR team members can find, tag, schedule, and debrief any of 1,904 attendees from their phones with one hand while walking between sessions — no spreadsheet required.
**Current focus:** Phase 4 — Tags + Filters

## Current Phase

**Phase 8: Ship + Verify**
- Status: Complete ✓
- Goal: Production smoke test on real phones, README, four-team sign-off
- SHIP-01 ✓ Phone sign-in verified (2026-05-17)
- SHIP-02 ✓ Non-@ceealar.org rejection verified (2026-05-17)
- SHIP-03 ✓ Full smoke test passed: import → search → tag → schedule → notes → action items → done → export (2026-05-17)
- SHIP-04 ✓ README.md committed and pushed (2026-05-17)

**Phase 9: Calendar Integration**
- Status: Implemented, awaiting human setup + UAT
- Goal: Per-user Swapcard iCal sync — auto-import "Meet *" events as planned meetings, calendar wins on time, Pulse owns notes/status
- Spec: ROADMAP.md → Phase 9
- Decisions: .planning/notes/icalendar-sync-decisions.md
- Build: passes clean, pushed (commit fcd5364)
- Pending human steps:
  1. Run supabase/migrations/0005_ical_sync.sql in Supabase SQL editor
  2. Add CRON_SECRET env var in Vercel (any random string, used by cron endpoint)
  3. Connect iCal URL via /me → Calendar → 3-step guide
  4. Verify auto-sync (5 min cron) and manual "Sync now" both work

## Phase History

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 0: Bootstrap | Complete ✓ | 2026-05-14 |
| Phase 1: Auth + Shell | Complete ✓ | 2026-05-14 |
| Phase 2: Attendees | Complete ✓ | 2026-05-15 |
| Phase 3: Meetings + Notes | Complete ✓ | 2026-05-15 |
| Phase 4: Tags + Filters | Complete ✓ | 2026-05-15 |
| Phase 5: Schedule + Conflicts | Complete ✓ | 2026-05-15 |
| Phase 6: Realtime + Feed | Complete ✓ | 2026-05-15 |
| Phase 7: Export + Polish | Complete ✓ | 2026-05-15 |
| Phase 8: Ship + Verify | Complete ✓ | 2026-05-17 |
| Phase 9: Calendar Integration | Spec'd | — |

## Blocked On

Nothing — Phase 3 complete (pending UAT), proceeding to Phase 4.

## Pending User Actions (before Phase 4)

Nothing — ready to plan Phase 4.

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
*Last session: 2026-05-15 — Completed Phase 7 (Export + Polish) with UAT approval. CSV export at /admin/export (27 columns, ~1904 rows), PWA manifest + teal icons, NotificationProvider with opt-in banner (Chrome requires user gesture), skeleton loading.tsx for all routes, empty states with helpful copy.*
*Session 2026-05-17 — Phase 8 complete. Fixed broken lightningcss native binary (npm install). Build passes clean. Wrote production README.md. All four SHIP requirements verified by Attila: phone sign-in, domain rejection, full smoke test (import→export), README pushed. v1.0 milestone DONE — all 9 phases complete, all 57 requirements met.*
