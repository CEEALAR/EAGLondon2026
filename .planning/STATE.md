# Project State: CEEALAR Pulse

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-14)

**Core value:** Four CEEALAR team members can find, tag, schedule, and debrief any of 1,904 attendees from their phones with one hand while walking between sessions — no spreadsheet required.
**Current focus:** Phase 1 — Auth + Shell

## Current Phase

**Phase 2: Attendees**
- Status: In Progress
- Goal: XLSX import + virtualized browse + detail + strategic context
- Next action: All 3 plans in Phase 2 complete — proceed to Phase 3 (Meetings + Notes)

## Phase History

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 0: Bootstrap | Complete ✓ | 2026-05-14 |
| Phase 1: Auth + Shell | In Progress | — |
| Phase 2: Attendees | In Progress (02-03 complete) | — |
| Phase 3: Meetings + Notes | Not started | — |
| Phase 4: Tags + Filters | Not started | — |
| Phase 5: Schedule + Conflicts | Not started | — |
| Phase 6: Realtime + Feed | Not started | — |
| Phase 7: Export + Polish | Not started | — |
| Phase 8: Ship + Verify | Not started | — |

## Blocked On

Nothing — 01-01 complete, proceeding to 01-02.

## Pending User Actions (before Phase 2)

- [ ] Run Supabase migration SQL (`ceealar-pulse/supabase/migrations/0001_team_members.sql`) in Supabase SQL editor
- [ ] Configure Google OAuth provider in Supabase Auth dashboard (Authorized redirect URL: `https://cjjlctmdfbvutjtoxagm.supabase.co/auth/v1/callback`)
- [ ] Place Swapcard XLSX at `./data/swapcard.xlsx` (gitignored)

## Live URLs

- **App:** https://eag-london2026.vercel.app/
- **GitHub:** https://github.com/CEEALAR/EAGLondon2026

## Pending User Actions (before Phase 2)

- [ ] Place Swapcard XLSX at `./data/swapcard.xlsx` (gitignored)

## Key Env Vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
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

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 00-bootstrap | 00-01 | ~30 min | 2 | 20+ |
| 01-auth-shell | 01-01 | ~12 min | 3 | 8 |
| 02-attendees | 02-03 | ~15 min | 2 | 2 |

---
*State initialized: 2026-05-14*
*Last session: 2026-05-15 — Completed 02-03-PLAN.md (attendee detail page + StrategicContextForm autosave)*
*Stopped at: Phase 3 (Meetings + Notes) — pending Phase 1 and Phase 2 prerequisites*
