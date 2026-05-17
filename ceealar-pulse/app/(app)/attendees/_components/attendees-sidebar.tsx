/**
 * Server component: fetches attendees + tags and renders the virtualized
 * AttendeeList. Shared by /attendees (full list / placeholder) and
 * /attendees/[id] (left column on desktop).
 */

import { createClient } from '@/lib/supabase/server'
import type { Attendee, Tag } from '@/lib/types'
import { AttendeeList } from './attendee-list'

export async function AttendeesSidebar() {
  const supabase = await createClient()

  const [
    { data: attendeesData },
    { data: allTagsData },
  ] = await Promise.all([
    supabase
      .from('attendees')
      .select('*, attendee_tags(tag_id)')
      .order('last_name', { ascending: true })
      .range(0, 9999),
    supabase.from('tags').select('id, name, color, is_system').order('name'),
  ])

  const attendees = (attendeesData as Attendee[]) ?? []
  const allTags = (allTagsData as Tag[]) ?? []

  return <AttendeeList attendees={attendees} allTags={allTags} />
}
