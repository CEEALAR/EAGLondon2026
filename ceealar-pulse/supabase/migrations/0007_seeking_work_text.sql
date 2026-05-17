-- Migration: 0007_seeking_work_text
-- Convert seeking_work from boolean to text so we preserve the full Swapcard
-- response values like "I'm actively looking for a new role", "I'm not
-- interested in a new role", "I'm happy where I am but feel free to pitch
-- me new ideas", "I'm seeking collaborators for an existing project/research".
--
-- After this migration, re-run the XLSX import from /admin to populate the
-- richer values for all attendees.

alter table public.attendees
  alter column seeking_work type text
  using case
    when seeking_work is true  then 'Yes'
    when seeking_work is false then 'No'
    else null
  end;
