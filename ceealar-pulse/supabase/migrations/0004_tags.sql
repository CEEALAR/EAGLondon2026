-- tags table
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text not null default '#0F766E',
  created_by uuid references auth.users(id) on delete set null,
  is_system  boolean not null default false,
  created_at timestamptz not null default now()
);

-- attendee_tags junction table
create table public.attendee_tags (
  attendee_id uuid not null references public.attendees(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (attendee_id, tag_id)
);

-- indexes
create index on public.attendee_tags(tag_id);
create index on public.attendee_tags(attendee_id);

-- RLS on tags
alter table public.tags enable row level security;

create policy "authenticated users can read all tags"
  on public.tags for select
  using (auth.uid() is not null);

create policy "authenticated users can create tags"
  on public.tags for insert
  with check (auth.uid() is not null);

create policy "owners can update own non-system tags"
  on public.tags for update
  using (auth.uid() = created_by and is_system = false);

create policy "owners can delete own non-system tags"
  on public.tags for delete
  using (auth.uid() = created_by and is_system = false);

-- RLS on attendee_tags
alter table public.attendee_tags enable row level security;

create policy "authenticated users can read attendee_tags"
  on public.attendee_tags for select
  using (auth.uid() is not null);

create policy "authenticated users can assign tags"
  on public.attendee_tags for insert
  with check (auth.uid() is not null);

create policy "authenticated users can remove tag assignments"
  on public.attendee_tags for delete
  using (auth.uid() is not null);

-- system tag seed
insert into public.tags (name, color, is_system) values
  ('partner',  '#0F766E', true),
  ('alumni',   '#7C3AED', true),
  ('funder',   '#B45309', true),
  ('prospect', '#1D4ED8', true)
on conflict (name) do nothing;
