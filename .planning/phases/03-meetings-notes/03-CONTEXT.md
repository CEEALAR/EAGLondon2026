# Phase 3 Context: Meetings + Notes

## What this phase delivers

Phase 3 delivers the full meeting lifecycle for the CEEALAR EAG London 2026 tool:
creating meetings from the attendee detail page, logging meeting notes and action items,
tracking status changes, and recording activity for audit purposes.

## Database objects introduced

### Tables

**meetings** — Core meeting record. All 4 team members can read and write any meeting.
Key fields: attendee_id, owner_id, status (want_to_meet | planned | done | no_show | cancelled),
scheduled_at (timestamptz nullable), duration_minutes, location, prep_note, summary,
meeting_notes, comments, follow_up_date (date nullable).

**action_items** — Per-meeting tasks. Linked to meetings via meeting_id (cascade delete).
Fields: text, due_date, done (boolean), created_by. All 4 team members can read, write, and delete.

**activity** — Append-only audit log. Rows written on: meeting_created, status_done,
action_item_added, action_item_completed. No UPDATE or DELETE RLS policy — rows are immutable.
Fields: actor_id, meeting_id, attendee_id, action_type, body.

### View

**meetings_view** — Wraps the meetings table. Returns prep_note as null unless
the querying user is the owner OR status = 'done'. All reads of prep_note MUST use this
view, never the base meetings table.

## TypeScript types (lib/types.ts)

New exports added in Phase 3 (Attendee type unchanged):
- `MeetingStatus` — union type of all five status values
- `Meeting` — mirrors meetings table; prep_note: string | null (may be null from view)
- `ActionItem` — mirrors action_items table
- `Activity` — mirrors activity table; action_type is a narrowed union
- `TeamMember` — mirrors team_members table (pre-existing table, type added in Phase 3)

## Helper module (lib/team-members.ts)

`fetchTeamMembers()` — async server function returning TeamMember[] ordered by display_name.
Used in server components and API routes. Do NOT import in client components.

## API routes

| Route | Methods | Notes |
|-------|---------|-------|
| /api/meetings | POST | Creates meeting + writes activity(meeting_created) |
| /api/meetings/[id] | PATCH | Updates any field; writes activity(status_done) on status transition to done |
| /api/meetings/[id]/action-items | GET, POST | Lists or creates items; POST writes activity(action_item_added) |
| /api/meetings/[id]/action-items/[itemId] | PATCH, DELETE | Toggle done (writes activity on completion), delete |

All routes: 401 on unauthenticated. Activity writes use service role client and set actor_id
from server-side auth.getUser() — never from request body.

## Page routes

| Route | Type | Notes |
|-------|------|-------|
| /meetings | Server Component | Lists all meetings across all attendees, ordered by created_at desc |
| /meetings/[id] | Client Component | Full detail: header, status changer, prep note (gated), notes, action items, follow-up date |

## Updated pages from Phase 2

**app/(app)/attendees/[id]/page.tsx** — Converted to Client Component. Now:
- Fetches data on mount via browser Supabase client
- "Schedule Meeting" button opens MeetingCreateDialog
- "Team Meetings" section shows real meetings list (replaces stub)

**app/(app)/meetings/page.tsx** — Replaced placeholder with real meetings list.

## Patterns established

**Prep note privacy:** Always query `meetings_view`, never `meetings`, when prep_note is needed.

**Autosave (synchronous fire-and-forget):** All autosave handlers (notes, follow-up date,
status) use the pattern from Phase 2 — no async keyword on the handler, optimistic state
update first, then fire-and-forget fetch call. This is required to avoid React 19 async
state issues with event handlers.

**Activity writes in API routes:** All activity inserts happen in API route handlers
using the service role client. Never write activity from client-side code directly.

**Status badge rendering:** Defined locally in each page that needs it using STATUS_COLORS
and STATUS_LABELS Record<MeetingStatus, string> constants. Not extracted to a shared component
(low duplication — only two pages use it in Phase 3).

## Stubs remaining for future phases

**app/(app)/attendees/[id]/page.tsx Section 4 (Tags):** Still stubbed with "Tag management
coming in Phase 4." Phase 4 wires real tag chips (ATT-07).

**app/(app)/meetings/page.tsx:** Shows a simple chronological list. Phase 5 replaces this
with a full schedule timeline view.

**Activity feed display:** Activity rows are written to the database in Phase 3 but there
is no UI to display them yet. Phase 5 or later may surface an activity feed.
