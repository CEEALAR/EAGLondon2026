/**
 * Server component: fetches attendees + tags and renders the virtualized
 * AttendeeList. Shared by /attendees and /attendees/[id] on desktop.
 */

import { createClient } from '@/lib/supabase/server'
import { fetchAllAttendees } from '@/lib/fetch-all-attendees'
import type { Attendee, Tag } from '@/lib/types'
import { AttendeeList } from './attendee-list'

export async function AttendeesSidebar() {
  const supabase = await createClient()

  const [attendees, { data: allTagsData }] = await Promise.all([
    fetchAllAttendees<Attendee>(supabase, '*, attendee_tags(tag_id)'),
    supabase.from('tags').select('id, name, color, is_system').order('name'),
  ])

  const allTags = (allTagsData as Tag[]) ?? []

  return <AttendeeList attendees={attendees} allTags={allTags} />
}
