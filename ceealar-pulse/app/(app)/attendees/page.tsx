import { createClient } from '@/lib/supabase/server'
import { Attendee, Tag } from '@/lib/types'
import { AttendeeList } from './_components/attendee-list'

export default async function AttendeesPage() {
  const supabase = await createClient()

  const [
    { data: attendeesData, error },
    { data: allTagsData },
  ] = await Promise.all([
    supabase.from('attendees').select('*, attendee_tags(tag_id)').order('last_name', { ascending: true }),
    supabase.from('tags').select('id, name, color, is_system').order('name'),
  ])

  if (error) {
    console.error('[AttendeesPage] Failed to fetch attendees:', error.message)
  }

  const attendees = (attendeesData as Attendee[]) ?? []
  const allTags = (allTagsData as Tag[]) ?? []

  return <AttendeeList attendees={attendees} allTags={allTags} />
}
