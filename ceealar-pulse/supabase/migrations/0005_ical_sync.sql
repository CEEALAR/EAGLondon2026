-- Migration: 0005_ical_sync
-- Phase 9: Swapcard iCal calendar integration.
--
-- Adds:
--   - user_ical_urls: per-user iCal URLs (one row per CEEALAR teammate)
--   - meetings.ical_uid + meetings.source: track which meetings came from iCal
--   - unmatched_ical_events: tray for events that couldn't be matched to an attendee

-- ── user_ical_urls ────────────────────────────────────────────────────────────

create table public.user_ical_urls (
  user_id          uuid primary key references public.team_members(id) on delete cascade,
  url              text not null,
  created_at       timestamptz not null default now(),
  last_synced_at   timestamptz,
  last_sync_error  text
);

alter table public.user_ical_urls enable row level security;

-- Users can only read/write their own iCal URL
create policy "users read own ical url"
  on public.user_ical_urls for select
  using (auth.uid() = user_id);

create policy "users insert own ical url"
  on public.user_ical_urls for insert
  with check (auth.uid() = user_id);

create policy "users update own ical url"
  on public.user_ical_urls for update
  using (auth.uid() = user_id);

create policy "users delete own ical url"
  on public.user_ical_urls for delete
  using (auth.uid() = user_id);

-- ── meetings: ical_uid + source ───────────────────────────────────────────────

alter table public.meetings
  add column ical_uid text,
  add column source   text not null default 'manual'
    check (source in ('manual', 'ical'));

create unique index meetings_ical_uid_user_idx
  on public.meetings (ical_uid, owner_id)
  where ical_uid is not null;

create index meetings_source_idx on public.meetings (source);

-- ── unmatched_ical_events ─────────────────────────────────────────────────────

create table public.unmatched_ical_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.team_members(id) on delete cascade,
  ical_uid        text not null,
  summary         text not null,
  candidate_name  text,
  start_at        timestamptz not null,
  end_at          timestamptz,
  location        text,
  dismissed       boolean not null default false,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, ical_uid)
);

alter table public.unmatched_ical_events enable row level security;

create policy "users read own unmatched"
  on public.unmatched_ical_events for select
  using (auth.uid() = user_id);

create policy "users update own unmatched"
  on public.unmatched_ical_events for update
  using (auth.uid() = user_id);

create policy "users delete own unmatched"
  on public.unmatched_ical_events for delete
  using (auth.uid() = user_id);

-- Inserts are done by the service role from sync jobs, so no insert policy

create index unmatched_user_active_idx
  on public.unmatched_ical_events (user_id)
  where dismissed = false and resolved_at is null;

-- ── meetings_view recreate to expose new columns ──────────────────────────────
-- The existing meetings_view selects * from meetings — re-issuing as create or
-- replace ensures the new columns are visible to read queries.

drop view if exists public.meetings_view;

create view public.meetings_view as
select
  m.id,
  m.attendee_id,
  m.owner_id,
  m.status,
  m.scheduled_at,
  m.duration_minutes,
  m.location,
  case
    when m.status = 'done' or m.owner_id = auth.uid() then m.prep_note
    else null
  end as prep_note,
  m.summary,
  m.meeting_notes,
  m.comments,
  m.follow_up_date,
  m.ical_uid,
  m.source,
  m.created_at,
  m.updated_at
from public.meetings m;

grant select on public.meetings_view to anon, authenticated;
