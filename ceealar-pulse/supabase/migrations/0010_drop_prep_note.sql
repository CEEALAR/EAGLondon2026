-- Migration: 0010_drop_prep_note
-- Removes the unused prep_note column on meetings. The UI hasn't surfaced it
-- since 0006, but any historical rows still held data that would otherwise be
-- included in /api/export. Also drops meetings_view since it only existed to
-- hide prep_note for non-owners.

drop view if exists public.meetings_view;

alter table public.meetings
  drop column if exists prep_note;
