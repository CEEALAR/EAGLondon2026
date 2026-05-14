-- Migration: 0002_attendees
-- Creates the attendees table for EAG London 2026 conference attendee data.
--
-- NOTE: Strategic context fields (why_they_matter, how_to_engage, hypothesis, risks,
-- collaboration_hooks) are SHARED across all four team members — last-write-wins.
-- There is no per-user isolation for these fields; this is intentional for a 4-person tool.
--
-- Data source: Swapcard XLSX export (1,904 rows). The file is gitignored and must never
-- be committed. See T-02-01 in the 02-01 threat model.

create table public.attendees (
  id                  uuid primary key default gen_random_uuid(),
  swapcard_url        text not null unique,
  first_name          text,
  last_name           text,
  company             text,
  job_title           text,
  career_stage        text,
  biography           text,
  expertise           text[],
  interests           text[],
  how_others_can_help text,
  how_i_can_help      text,
  country             text,
  seeking_work        boolean,
  recruitment         text,
  linkedin            text,
  -- Strategic context columns — shared across team, not per-user
  why_they_matter     text,
  how_to_engage       text,
  hypothesis          text,
  risks               text,
  collaboration_hooks text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Row-level security
alter table public.attendees enable row level security;

create policy "Authenticated users can select attendees"
  on public.attendees for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert attendees"
  on public.attendees for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update attendees"
  on public.attendees for update
  using (auth.uid() is not null);

-- GIN full-text search index on name and company fields
create index attendees_search_idx
  on public.attendees
  using gin (
    to_tsvector('english',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(company, '')
    )
  );

-- updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger attendees_updated_at
  before update on public.attendees
  for each row
  execute procedure update_updated_at();
