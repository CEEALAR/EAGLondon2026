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
| ~~`meetings_view` Postgres view for prep_note RLS~~ | ~~Simplest way to hide private field without complex RLS policies~~ | **Dropped in migration 0010 (Phase 10)** — prep_note column + view both removed once UI stopped surfacing the field |
| Owner-only `update`/`delete` on meetings/action_items | Brief specifies; status field team-editable as exception | — Pending |
| Zod for form validation (optional) | Claude's call — use if it speeds up forms, otherwise HTML constraints | — Pending |
| Service-role admin client for all writes, anon (RLS) for reads | Phase 3 pattern, audited Phase 10; not centralised because call sites are audited and centralising provides no security delta | Active (Phase 10) |
| `activity` table records audit trail for sensitive mutations | Phase 10 — actions: `meeting_created`, `status_done`, `action_item_added`, `action_item_completed`, `priority_changed`, `tag_added`, `tag_removed`. Future attendee-mutation routes MUST follow the same pattern: read previous → write → append `activity` row with `actor_id`, `attendee_id`, descriptive `action`, `detail` JSON | Active (Phase 10) |
| `safeHttpUrl()` from `lib/utils.ts` is the only allowed render path for attendee-controlled links | Phase 10 — `attendee.linkedin` / `attendee.swapcard_url` are partially attendee-controlled via Swapcard; raw render allowed `javascript:` URI XSS | Active (Phase 10) |
| Server-side fetch of user-supplied URLs requires the SSRF playbook | Phase 10 — `new URL()` parse, hostname allowlist, `redirect: 'manual'`, response size cap. Reference impl: `lib/ical-sync.ts` `fetchICalText()` | Active (Phase 10) |
| Security headers (CSP + friends) live in `middleware.ts` `applySecurityHeaders()` | Phase 10 — applied to every response including redirects. CSP allows `'unsafe-inline'` for script/style because Next.js needs it; real defence is `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `connect-src` locked to Supabase host | Active (Phase 10) |
| `xlsx@0.18.5` known-CVE package retained until post-conference | Auth-gated to 4 trusted users; replacement is behaviour-change in import path — too risky pre-conference. **Replace post-2026-05-31** with SheetJS CDN build or `exceljs` | Active (Phase 10) |
| Every `meetings → team_members` embed MUST use a FK hint | Phase 12 found B-1: `team_members(...)` is ambiguous because migration 0004 added `meeting_members` as a second FK path. PostgREST throws PGRST201 and returns null silently. Use `team_members!meetings_owner_id_fkey(...)` or `team_members!meeting_members_user_id_fkey(...)` depending on which relationship is meant | Active (Phase 12) |
| Mutating buttons MUST be DB-state-aware | Phase 12 found B-2: a button that always says "Want to meet" creates duplicates on repeat clicks. Pattern: server passes `existing<X>: {…} \| null` to the client component, which renders different UI for "doesn't exist" (create) vs "exists" (remove). No 2-second "Added" flash that reverts | Active (Phase 12) |
| User-specific routes MUST have `export const dynamic = 'force-dynamic'` | Phase 12 — `/me` was the lone exception; combined with the previous `staleTimes.dynamic: 60` it served stale state for up to a minute after mutations. Apply to `/me`, `/feed`, `/admin`, any future user-specific page | Active (Phase 12) |
| `next.config.ts` `staleTimes.dynamic: 0` (Next 15 default) | Phase 12 trade-off: snappy back/forward navigation vs. freshness after mutations. For an internal coordination tool, freshness wins | Active (Phase 12) |
| Persisted UI prefs go in `localStorage` with versioned keys (`pulse.<area>.prefs.v<N>`) | Phase 12 pattern in `attendee-list.tsx`. Bump version suffix if the FilterState shape changes in a breaking way. Sets serialise as arrays (`filtersToJson` / `filtersFromJson`) | Active (Phase 12) |
| Web is canonical for digital surfaces; Canva sources may drift | Phase 12: design-system v0.3 migrated palette from Canva-extracted v0.2 (`#018498` teal) to Pulse production (`#0F766E` teal). Future digital work pulls from `CEEALAR/design-system` (v0.3+); print/Canva work stays separate | Active (Phase 12) |
| Cross-repo design-system updates flow Pulse → design-system | Phase 12 set precedent: when web evolves a token, push to `CEEALAR/design-system` (don't redefine in each consumer). Files of record: `colors_and_type.css` + `effects-and-motion.css` + `tokens.json` | Active (Phase 12) |

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
*Last updated: 2026-05-18 after Phase 12 (field testing fixes + design-system v0.3)*
