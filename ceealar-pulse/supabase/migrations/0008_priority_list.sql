-- Migration: 0008_priority_list
-- CEEALAR's Top-50 priority list import: a curated ranking of attendees
-- with strategic context (Why Relevant + Talking Points) imported from XLSX.
--
-- Priority scale: 5 = Critical (highest), 4 = High, 3 = Medium, 2 = Low, 1 = Optional
--
-- Why Relevant + Talking Points map to existing attendees.why_they_matter
-- and attendees.how_to_engage (added in 0002_attendees.sql). The 'imported'
-- columns store the latest XLSX-sourced value so the UI can show
-- "Spreadsheet says: …" when the user has edited the canonical value.

alter table public.attendees
  add column if not exists priority smallint
    check (priority is null or (priority between 1 and 5)),
  add column if not exists priority_category text,
  add column if not exists priority_imported_at timestamptz,
  add column if not exists priority_imported_why_relevant text,
  add column if not exists priority_imported_talking_points text;

create index if not exists attendees_priority_idx
  on public.attendees (priority) where priority is not null;
