-- Migration: 0003_meetings
-- Creates meetings, action_items, and activity tables for Phase 3.
--
-- Key design decisions:
-- - prep_note is hidden from non-owners via meetings_view (Postgres view + auth.uid() check)
-- - status enum enforced via CHECK constraint
-- - Activity table is append-only — no update/delete RLS policies
-- - meetings_view is used for reads; base meetings table is used for inserts/updates
-- - update_updated_at() trigger function already exists from 0002_attendees.sql

-- ── meetings ──────────────────────────────────────────────────────────────────

create table public.meetings (
  id               uuid primary key default gen_random_uuid(),
  attendee_id      uuid not null references public.attendees(id) on delete cascade,
  owner_id         uuid references public.team_members(id) on delete set null,
  status           text not null default 'want_to_meet'
                     check (status in ('want_to_meet','planned','done','no_show','cancelled')),
  scheduled_at     timestamptz,
  duration_minutes integer,
  location         text,
  prep_note        text,   -- owner-private until status='done'
  summary          text,
  meeting_notes    text,
  comments         text,
  follow_up_date   date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.meetings enable row level security;

create policy "Authenticated users can select meetings"
  on public.meetings for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert meetings"
  on public.meetings for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update meetings"
  on public.meetings for update
  using (auth.uid() is not null);

create policy "Owners can delete their meetings"
  on public.meetings for delete
  using (auth.uid() = owner_id);

create trigger meetings_updated_at
  before update on public.meetings
  for each row
  execute procedure update_updated_at();

create index meetings_attendee_id_idx on public.meetings (attendee_id);
create index meetings_owner_id_idx    on public.meetings (owner_id);
create index meetings_status_idx      on public.meetings (status);

-- ── meetings_view ─────────────────────────────────────────────────────────────
-- Hides prep_note for non-owners when status != 'done'.
-- All read queries should use this view, not the base table.

create or replace view public.meetings_view as
select
  m.id,
  m.attendee_id,
  m.owner_id,
  m.status,
  m.scheduled_at,
  m.duration_minutes,
  m.location,
  m.summary,
  m.meeting_notes,
  m.comments,
  m.follow_up_date,
  m.created_at,
  m.updated_at,
  case
    when m.status = 'done'          then m.prep_note
    when m.owner_id = auth.uid()    then m.prep_note
    else null
  end as prep_note
from public.meetings m;

-- ── action_items ─────────────────────────────────────────────────────────────

create table public.action_items (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  created_by uuid references public.team_members(id) on delete set null,
  text       text not null,
  due_date   date,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.action_items enable row level security;

create policy "Authenticated users can select action_items"
  on public.action_items for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert action_items"
  on public.action_items for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update action_items"
  on public.action_items for update
  using (auth.uid() is not null);

create policy "Authenticated users can delete action_items"
  on public.action_items for delete
  using (auth.uid() is not null);

create index action_items_meeting_id_idx on public.action_items (meeting_id);

-- ── activity ──────────────────────────────────────────────────────────────────
-- Append-only audit log. action values:
--   'meeting_created', 'status_done', 'action_item_added', 'action_item_completed'

create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.team_members(id) on delete set null,
  meeting_id  uuid references public.meetings(id) on delete cascade,
  attendee_id uuid references public.attendees(id) on delete cascade,
  action      text not null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);

alter table public.activity enable row level security;

create policy "Authenticated users can select activity"
  on public.activity for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert activity"
  on public.activity for insert
  with check (auth.uid() is not null);

-- No update/delete on activity — append-only

create index activity_meeting_id_idx  on public.activity (meeting_id);
create index activity_created_at_idx  on public.activity (created_at desc);
create index activity_actor_id_idx    on public.activity (actor_id);
