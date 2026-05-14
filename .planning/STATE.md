# Project State: CEEALAR Pulse

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-14)

**Core value:** Four CEEALAR team members can find, tag, schedule, and debrief any of 1,904 attendees from their phones with one hand while walking between sessions — no spreadsheet required.
**Current focus:** Phase 0 — Bootstrap

## Current Phase

**Phase 0: Bootstrap**
- Status: IN PROGRESS — Plan 01 complete, Plan 02 pending
- Goal: Deployed Next.js 15 shell with live Vercel URL
- Plans: 2 plans in 2 waves (00-01-PLAN.md complete, 00-02-PLAN.md next)
- Next action: Execute 00-02-PLAN.md (GitHub push + Vercel deploy)

## Phase History

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 0: Bootstrap | In Progress | — |
| Phase 1: Auth + Shell | Not started | — |
| Phase 2: Attendees | Not started | — |
| Phase 3: Meetings + Notes | Not started | — |
| Phase 4: Tags + Filters | Not started | — |
| Phase 5: Schedule + Conflicts | Not started | — |
| Phase 6: Realtime + Feed | Not started | — |
| Phase 7: Export + Polish | Not started | — |
| Phase 8: Ship + Verify | Not started | — |

## Blocked On

Nothing yet.

## Pending User Actions (before Phase 0)

- [ ] Create Supabase project → provide URL + anon key + service role key
- [ ] Set up Google Cloud OAuth client → provide client ID + secret
- [ ] Create empty GitHub repo → provide URL
- [ ] Create Vercel project linked to repo

## Pending User Actions (after Phase 0)

- [ ] Set env vars in Vercel dashboard (exact vars listed at end of Phase 0)
- [ ] Run Supabase migration SQL (provided after Phase 0)

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

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 00-bootstrap | 00-01 | ~30 min | 2 | 20+ |

---
*State initialized: 2026-05-14*
*Last session: 2026-05-14 — Completed 00-01-PLAN.md (scaffold + brand)*
*Stopped at: 00-02-PLAN.md (GitHub push + Vercel deploy)*
