# Project State: CEEALAR Pulse

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-14)

**Core value:** Four CEEALAR team members can find, tag, schedule, and debrief any of 1,904 attendees from their phones with one hand while walking between sessions — no spreadsheet required.
**Current focus:** Phase 0 — Bootstrap

## Current Phase

**Phase 0: Bootstrap**
- Status: NOT STARTED
- Goal: Deployed Next.js 15 shell with live Vercel URL
- Target: 30 minutes
- Next action: `/gsd-plan-phase 0`

## Phase History

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 0: Bootstrap | Not started | — |
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

---
*State initialized: 2026-05-14*
