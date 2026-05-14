create table public.team_members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.team_members enable row level security;

create policy "team members can view all"
  on public.team_members for select
  using (auth.uid() is not null);

create policy "users can update own record"
  on public.team_members for update
  using (auth.uid() = id);
