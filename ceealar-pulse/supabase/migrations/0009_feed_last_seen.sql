-- Migration: 0009_feed_last_seen
-- Tracks when each team member last visited /feed so we can compute an
-- unread-activity count (used for the Feed tab notification badge).

alter table public.team_members
  add column if not exists feed_last_seen_at timestamptz not null default now();
