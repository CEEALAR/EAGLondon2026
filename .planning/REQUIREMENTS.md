# Requirements: CEEALAR Pulse

**Defined:** 2026-05-14
**Core Value:** Four CEEALAR team members can find, tag, schedule, and debrief any of 1,904 attendees from their phones with one hand while walking between sessions — no spreadsheet required.

## v1 Requirements

### Bootstrap

- [ ] **BOOT-01**: Next.js 15 App Router project scaffolded with TypeScript and Tailwind
- [ ] **BOOT-02**: All dependencies installed (Supabase, SheetJS, date-fns, lucide-react, TanStack Virtual, shadcn/ui with required components)
- [ ] **BOOT-03**: Placeholder home page deployed to Vercel with live URL confirmed

### Authentication

- [ ] **AUTH-01**: User can sign in with Google OAuth via "Continue with Google" button
- [ ] **AUTH-02**: Sign-in is restricted to @ceealar.org hosted domain (Supabase hd param + application layer)
- [ ] **AUTH-03**: Non-@ceealar.org sign-in attempts are rejected with "This tool is for the CEEALAR team only" and user is signed out
- [ ] **AUTH-04**: On first sign-in, team_members record is upserted with id, email, display name, avatar from Google
- [ ] **AUTH-05**: User can sign out from profile dropdown
- [ ] **AUTH-06**: Authenticated app has bottom tab bar on mobile / top nav on desktop: Attendees · Meetings · Feed · Me

### Import

- [ ] **IMPORT-01**: /admin/import route accepts XLSX file via drag-and-drop upload
- [ ] **IMPORT-02**: SheetJS parser reads sheet "Attendee Data", skips rows 1–4, uses row 5 as headers, imports from row 6
- [ ] **IMPORT-03**: All 15 columns mapped correctly: First Name, Last Name, Company, Job Title, Career Stage, Biography, Areas of Expertise, Areas of Interest, How Others Can Help Me, How I Can Help Others, Country, Seeking work?, Recruitment, Swapcard, LinkedIn
- [ ] **IMPORT-04**: Areas of Expertise and Areas of Interest split on ";" and stored as text[]
- [ ] **IMPORT-05**: Names sanitized (.trim() + strip zero-width spaces U+200B via `.replace(//g, '')`)
- [ ] **IMPORT-06**: Swapcard URL used as natural key; import upserts on conflict
- [ ] **IMPORT-07**: Import shows progress and final counts: inserted, updated, skipped
- [ ] **IMPORT-08**: Blank fields preserved as null (no invented data)

### Attendees

- [ ] **ATT-01**: /attendees shows virtualized list of all attendees (TanStack Virtual, no pagination)
- [ ] **ATT-02**: Each row shows initials avatar, name, company · job title, top 2 expertise chips, assigned tag chips
- [ ] **ATT-03**: Sticky search bar filters by name and company (debounced 200ms)
- [ ] **ATT-04**: Filter sheet (mobile bottom sheet / desktop drawer) by: tags, areas of expertise, areas of interest, country, has-meeting/no-meeting, my-meetings-only
- [ ] **ATT-05**: /attendees/[id] shows full Swapcard data fields
- [ ] **ATT-06**: CEEALAR strategic context section on detail (inline editable, autosave on blur): Why They Matter, How to Engage, Hypothesis, Risks, Collaboration Hooks
- [ ] **ATT-07**: Tag chips on detail with add/remove capability
- [ ] **ATT-08**: All team members' meetings with this person listed on detail page
- [ ] **ATT-09**: "Schedule meeting" CTA on detail page opens meeting create dialog

### Meetings

- [ ] **MEET-01**: Meeting create dialog: owner (defaults to current user, reassignable dropdown), status, date+time, duration, location
- [ ] **MEET-02**: "Want to meet" quick action creates meeting with status='want_to_meet', no time required
- [ ] **MEET-03**: /meetings/[id] shows attendee name (linked), owner, status badge, scheduled time
- [ ] **MEET-04**: Prep note visible only to owner OR when status='done' (via meetings_view Postgres view)
- [ ] **MEET-05**: Per-meeting log: Summary, Meeting Notes, Comments — labeled textareas with autosave on blur
- [ ] **MEET-06**: Action items: add (text + optional due date), check off, delete; all four team members can see all items
- [ ] **MEET-07**: Status changer with confirmation: done / no-show / cancelled
- [ ] **MEET-08**: Follow-up date picker saves and displays on meeting page
- [ ] **MEET-09**: Activity row written on: meeting create, status→done, action item add, action item complete

### Tags

- [ ] **TAG-01**: Tag chip component: name + color dot, X removes assignment on attendee detail
- [ ] **TAG-02**: "Add tag" popover: search existing tags, "Create new tag '...'" inline option, 8-swatch color picker (teal-700 default)
- [ ] **TAG-03**: /attendees filter supports multi-tag (AND semantics)
- [ ] **TAG-04**: /me/tags page: view own created tags, rename, recolor, delete (only if unassigned); system tags (partner/alumni/funder/prospect) cannot be deleted or renamed

### Schedule

- [ ] **SCHED-01**: /meetings timeline: three-day vertical stack (29, 30, 31 May 2026), hourly slots, swimlanes per team member (mobile: tabbed by person; desktop: 4-column grid)
- [ ] **SCHED-02**: Meeting blocks show attendee name, location, status color (planned=teal, done=gold, no_show/cancelled=muted)
- [ ] **SCHED-03**: Tapping a meeting block navigates to /meetings/[id]
- [ ] **SCHED-04**: Soft conflict banner on attendee detail if another team member has a meeting with same person
- [ ] **SCHED-05**: Soft conflict warning on meeting create if another team member has want_to_meet for same person

### Realtime & Feed

- [ ] **RT-01**: App subscribes at layout level to meetings, action_items, activity Supabase Realtime Postgres Changes
- [ ] **RT-02**: Realtime changes invalidate relevant client-side state
- [ ] **RT-03**: /feed shows reverse-chronological human-readable activity (e.g. "Attila scheduled a meeting with Sarah Chen for 30 May 14:00")
- [ ] **RT-04**: Feed groups entries by day with relative timestamps ("2h ago")
- [ ] **RT-05**: Create/edit operations use optimistic UI

### Export & Polish

- [ ] **EXP-01**: /admin/export downloads CSV with all Swapcard fields + CEEALAR strategic fields + tags (comma-joined) + meeting count + last meeting status + open action item count
- [ ] **EXP-02**: PWA manifest + apple-touch-icon for add-to-home-screen on iOS/Android
- [ ] **EXP-03**: Browser Notification API fires 10 min before each today's scheduled meetings (permission prompt on load, setTimeout chain refreshed on meeting changes)
- [ ] **EXP-04**: Skeleton states on all list views during load
- [ ] **EXP-05**: Empty states with helpful copy on all empty views

### Ship

- [ ] **SHIP-01**: Production URL works on phones with @ceealar.org Google accounts
- [ ] **SHIP-02**: Non-ceealar email sign-in rejected gracefully
- [ ] **SHIP-03**: Full smoke test passes: import → browse → tag → schedule → notes → action items → done → export
- [ ] **SHIP-04**: README.md with live URL, usage intro, env vars, "if it breaks" notes

## v2 Requirements

- **V2-01**: Bulk tag assignment from attendee list view
- **V2-02**: Meeting templates with recurring prep prompts
- **V2-03**: Attendee similarity / "people like who you're meeting" suggestions
- **V2-04**: Per-attendee PDF briefing export
- **V2-05**: ICS calendar export

## Out of Scope

| Feature | Reason |
|---------|--------|
| Dark mode | Not requested; adds CSS complexity |
| Email notifications | Brief: browser notifications only |
| Google Calendar sync / ICS | Team will copy/paste; out of scope by brief |
| Attendee list pagination | Must virtualize — explicitly rejected |
| User / admin roles | Four equal users |
| Unit / integration / e2e tests | Explicitly excluded by brief |
| CI/CD beyond Vercel defaults | Unnecessary for 4-person tool |
| Redux, Zustand, tRPC, Prisma | Stack locked |
| Storybook, ESLint, Prettier, Husky | No ceremony |
| Invite / onboarding flow | Hard-code 4 emails if faster |
| Paid third-party services | Must stay on Supabase free + Vercel hobby |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BOOT-01 | Phase 0 | Pending |
| BOOT-02 | Phase 0 | Pending |
| BOOT-03 | Phase 0 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| IMPORT-01 | Phase 2 | Pending |
| IMPORT-02 | Phase 2 | Pending |
| IMPORT-03 | Phase 2 | Pending |
| IMPORT-04 | Phase 2 | Pending |
| IMPORT-05 | Phase 2 | Pending |
| IMPORT-06 | Phase 2 | Pending |
| IMPORT-07 | Phase 2 | Pending |
| IMPORT-08 | Phase 2 | Pending |
| ATT-01 | Phase 2 | Pending |
| ATT-02 | Phase 2 | Pending |
| ATT-03 | Phase 2 | Pending |
| ATT-04 | Phase 2 | Pending |
| ATT-05 | Phase 2 | Pending |
| ATT-06 | Phase 2 | Pending |
| ATT-07 | Phase 4 | Pending |
| ATT-08 | Phase 3 | Pending |
| ATT-09 | Phase 2 | Pending |
| MEET-01 | Phase 3 | Pending |
| MEET-02 | Phase 3 | Pending |
| MEET-03 | Phase 3 | Pending |
| MEET-04 | Phase 3 | Pending |
| MEET-05 | Phase 3 | Pending |
| MEET-06 | Phase 3 | Pending |
| MEET-07 | Phase 3 | Pending |
| MEET-08 | Phase 3 | Pending |
| MEET-09 | Phase 3 | Pending |
| TAG-01 | Phase 4 | Pending |
| TAG-02 | Phase 4 | Pending |
| TAG-03 | Phase 4 | Pending |
| TAG-04 | Phase 4 | Pending |
| SCHED-01 | Phase 5 | Pending |
| SCHED-02 | Phase 5 | Pending |
| SCHED-03 | Phase 5 | Pending |
| SCHED-04 | Phase 5 | Pending |
| SCHED-05 | Phase 5 | Pending |
| RT-01 | Phase 6 | Pending |
| RT-02 | Phase 6 | Pending |
| RT-03 | Phase 6 | Pending |
| RT-04 | Phase 6 | Pending |
| RT-05 | Phase 6 | Pending |
| EXP-01 | Phase 7 | Pending |
| EXP-02 | Phase 7 | Pending |
| EXP-03 | Phase 7 | Pending |
| EXP-04 | Phase 7 | Pending |
| EXP-05 | Phase 7 | Pending |
| SHIP-01 | Phase 8 | Pending |
| SHIP-02 | Phase 8 | Pending |
| SHIP-03 | Phase 8 | Pending |
| SHIP-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-14*
*Last updated: 2026-05-14 after initial definition*
