-- Migration: 0004_meeting_members
-- Adds meeting_members join table so multiple CEEALAR team members
-- can be assigned to a single meeting.
--
-- owner_id on meetings stays (records who created it).
-- meeting_members is the authoritative list for "who is assigned".
-- On creation, the owner is automatically inserted into meeting_members.

create table public.meeting_members (
  meeting_id  uuid not null references public.meetings(id) on delete cascade,
  user_id     uuid not null references public.team_members(id) on delete cascade,
  added_by    uuid references public.team_members(id) on delete set null,
  added_at    timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

alter table public.meeting_members enable row level security;

create policy "authenticated users can view meeting_members"
  on public.meeting_members for select
  using (auth.uid() is not null);

create policy "authenticated users can insert meeting_members"
  on public.meeting_members for insert
  with check (auth.uid() is not null);

create policy "authenticated users can delete meeting_members"
  on public.meeting_members for delete
  using (auth.uid() is not null);

create index meeting_members_user_idx    on public.meeting_members (user_id);
create index meeting_members_meeting_idx on public.meeting_members (meeting_id);

-- Backfill: add every existing meeting's owner_id into meeting_members
insert into public.meeting_members (meeting_id, user_id, added_by)
select id, owner_id, owner_id
from   public.meetings
where  owner_id is not null
on conflict do nothing;
