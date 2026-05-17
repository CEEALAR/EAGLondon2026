-- Migration: 0006_meeting_notes_rename
-- Replaces 'summary' with 'why_relevant', adds 'talking_points'.
-- Keeps prep_note column in the table but UI no longer surfaces it.
-- summary column kept for safety; backfill copies any data into why_relevant.

alter table public.meetings
  add column if not exists why_relevant   text,
  add column if not exists talking_points text;

-- Backfill: copy existing summary into why_relevant where why_relevant is empty
update public.meetings
   set why_relevant = summary
 where why_relevant is null and summary is not null;
