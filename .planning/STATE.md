# Project State: CEEALAR Pulse

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-14)

**Core value:** Four CEEALAR team members can find, tag, schedule, and debrief any of 1,904 attendees from their phones with one hand while walking between sessions — no spreadsheet required.
**Current focus:** Live — conference 29–31 May 2026 (11 days out).

## Current Phase

**Phase 12: Field Testing & Operational Polish**
- Status: Complete ✓ (shipped 2026-05-17 → 2026-05-18)
- Summary: `.planning/phases/12-field-testing-fixes/12-SUMMARY.md`
- Commits: d7ca502, 4dc6066, 03812fd, 5a89fd7, d772318, 2f462d9, 36eb710
- Cross-repo: CEEALAR/design-system @ 5112a35 (v0.3.0)
- Headline shipped:
  - **Operational data**: priority XLSX → 26 want_to_meets assigned to Attila/Jonas via new idempotent script; dedup script cleaned 5 duplicates
  - **Real bugs found in user testing**: /me silently returned 0 rows due to PGRST201 ambiguous embed on team_members; want-to-meet button had no DB-state awareness (every click duplicated); staleTimes.dynamic=60 served stale data after mutations; /me missing force-dynamic
  - **Features**: attendee list filter/sort/query persistence (localStorage); assignee pills on each row; "Assigned to" filter dimension
  - **Performance**: code-split /meetings/[id] (Edit/Delete dialogs, FollowUpDate, AttendeeProfileSection)
  - **Design system**: CEEALAR/design-system v0.3.0 — palette aligned to Pulse (#0F766E teal, #D4A017 gold); new effects-and-motion.css with editorial utility classes; web is now canonical for digital surfaces

## Previous Phases

**Phase 10: Admin Overhaul + Security Pass**
- Status: Complete ✓ (shipped 2026-05-17)
- Summary: `.planning/phases/10-admin-and-security/10-SUMMARY.md`
- Commits: d86ad43, 760d112, 9372569, cae3ac7, cc36308
- Headline shipped:
  - **Admin** — per-person load, priority/category coverage, P5/P4 gaps list, oldest want-to-meets, calendar sync health, force-sync-all button
  - **Priority editor** — clickable inline popover on attendee + meeting detail
  - **Security** — auth-callback hardening, SSRF defences on iCal fetch, safeHttpUrl() filter on user-controlled links, audit-trail rows on priority/tag mutations, XLSX upload size/row caps, CSP + security headers via middleware, prep_note column dropped (migration 0010)
  - **CI** — `.github/workflows/check.yml` runs typecheck + lint + build on every push to `main`; `npm run check` is the local equivalent. No unit tests yet (Vitest deferred to post-conference).
- Operational items confirmed done by user:
  - Migration 0010 applied in Supabase ✓
  - MFA enabled on all 4 Google accounts ✓
  - RLS verified on every table in Supabase Table Editor ✓
  - SUPABASE_SERVICE_ROLE_KEY isolated to Vercel env ✓
- Deferred / accepted (see SUMMARY for rationale):
  - H-2 admin role split (4 trusted users — not needed)
  - H-3 owner_id transfer in PATCH /api/meetings/[id] (accepted)
  - M-1 raw DB error messages (low value internal)
  - M-3 centralize service-role admin client (no security delta)
  - xlsx@0.18.5 known CVEs — auth-gated to 4 users; **replace after conference**

**Phase 9: Calendar Integration**
- Status: Implemented, awaiting human setup + UAT
- Goal: Per-user Swapcard iCal sync — auto-import "Meet *" events as planned meetings, calendar wins on time, Pulse owns notes/status
- Spec: ROADMAP.md → Phase 9
- Decisions: .planning/notes/icalendar-sync-decisions.md
- Pending human steps:
  1. Run supabase/migrations/0005_ical_sync.sql in Supabase SQL editor
  2. Add CRON_SECRET env var in Vercel (any random string, used by cron endpoint)
  3. Connect iCal URL via /me → Calendar → 3-step guide
  4. Verify auto-sync (5 min cron) and manual "Sync now" both work

**Phase 8: Ship + Verify**
- Status: Complete ✓
- All four SHIP requirements signed off 2026-05-17.

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
| Phase 10: Admin + Security | Complete ✓ | 2026-05-17 |
| Phase 11: Pre-Conference Polish | Complete ✓ | 2026-05-17 |
| Phase 12: Field Testing Fixes | Complete ✓ | 2026-05-18 |

## Blocked On

Nothing.

## Pending User Actions

- **After conference (post-2026-05-31):**
  - Replace `xlsx@0.18.5` (npm package abandoned; SheetJS CDN tarball or `exceljs` are the maintained options). Test the import path end-to-end since this is a behaviour-changing dep swap.
  - Add Vitest unit tests on `lib/utils.ts`, `lib/ical-parser.ts`, `lib/ical-sync.ts` `matchAttendees()`, `lib/admin-stats.ts`. ~15-20 tests, half a day. Wire `vitest run` into `npm run check`. Plan documented in `.planning/phases/10-admin-and-security/10-SUMMARY.md` § Testing & CI.

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
*Session 2026-05-17 (afternoon) — Phase 10 shipped (commits d86ad43, 760d112, 9372569, cae3ac7). (1) Admin page overhauled with per-person load bars, priority/category coverage progress bars, P5/P4 gaps list, oldest want-to-meets, calendar sync health, and a force-sync-all button (new endpoint POST /api/admin/sync-all, new helper lib/admin-stats.ts). (2) Inline priority editor (components/priority-editor.tsx + PATCH /api/attendees/[id]/priority) on attendee and meeting detail pages. (3) Full security review by Security Engineer agent — shipped C-1 auth callback hardening, C-2 SSRF defences in lib/ical-sync.ts (URL parse + host allowlist + redirect:'manual' + size cap), M-2 safeHttpUrl() filter in lib/utils.ts applied to all attendee link sites, H-1 audit log rows on priority/tag mutations (activity table actions: priority_changed/tag_added/tag_removed), H-4 scrubbed sync-all error details, M-4 25MB/5000-row XLSX upload caps. (4) CSP + security headers via middleware.ts. (5) Migration 0010 drops meetings.prep_note column + meetings_view (applied by user). Operational: user confirmed MFA on all 4 Google accounts, RLS enabled on every table, service-role key isolated to Vercel. Deferred items (H-2/H-3/M-1/M-3 accepted; xlsx@0.18.5 replacement scheduled post-conference). See .planning/phases/10-admin-and-security/10-SUMMARY.md for full handoff details.*
*Session 2026-05-17 (evening) — Senior-architect pre-conference review by claude (acting as senior staff engineer) shipped as Phase 11 (commits cc36308, 180aaba). P0 ship-blockers: root app/error.tsx, /me/loading.tsx, OfflineBanner mounted in app/(app)/layout.tsx, action-items optimistic rollback + toast, find-time duration_minutes fix (was hardcoded 30 min). P1: realtime refresh debounce 2s leading-edge in RealtimeProvider, middleware matcher excludes manifest/robots/sitemap/.ico. P2: loading skeletons for /admin, /meetings/[id], /attendees/[id]; signin countdown adds post-conference phase + 30s tick instead of 1s; empty-state copy normalized to "No X yet — why/how"; useMemo dep wrap on dayData. next/image with images.remotePatterns for lh3.googleusercontent.com (Google avatars in TopNav + /me). P3: .nvmrc pins Node 22, app/not-found.tsx custom 404. Lint 3→0 warnings. Bundle sizes unchanged. See .planning/phases/11-pre-conference-polish/11-SUMMARY.md.*
*Session 2026-05-17 late → 2026-05-18 — Phase 12 driven by hands-on user testing. (1) Code-split /meetings/[id] (d7ca502): Edit/Delete dialogs + FollowUpDate + AttendeeProfileSection now lazy via next/dynamic; non-owners skip dialog chunks. (2) Operational: scripts/assign-priority-owners.mjs (4dc6066) wrote 26 want_to_meet rows from the Top-50 XLSX Owner column (15 Attila, 11 Jonas) idempotently; scripts/dedup-want-to-meets.mjs (2f462d9) collapsed 5 dupes for Michael Aird from pre-fix button clicks. (3) Real bugs: /me silently returned 0 rows because team_members(...) embed became ambiguous after migration 0004 added meeting_members as a 2nd FK path — fixed with !meetings_owner_id_fkey hint (36eb710); want-to-meet button created duplicates because it had no awareness of existing rows — now reads existingWantToMeet from server, renders "On your list" pill with checkmark, click triggers DELETE (d772318); /me missing force-dynamic (03812fd); next.config staleTimes.dynamic=60 was caching client RSC for 60s → set to 0 (d772318). (4) Features: attendee list filter/sort/query persistence to localStorage key pulse.attendees.prefs.v1 (5a89fd7); assignee pills (colored initial chips) on each attendee row + "Assigned to" filter dimension with chips + persistence (36eb710). (5) Cross-repo: CEEALAR/design-system v0.3.0 (5112a35) — palette migrated to Pulse production values (#0F766E teal, #D4A017 gold), added effects-and-motion.css with editorial utility classes (.editorial-h1/-eyebrow/.hr-editorial/.hero-header/.glass/.press/.lift/.fade-up/.stagger), README rewritten, "web is canonical for digital surfaces" called out. Pulse globals.css already matches v0.3 (Pulse is where the values came from). See .planning/phases/12-field-testing-fixes/12-SUMMARY.md.*
