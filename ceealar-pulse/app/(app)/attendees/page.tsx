import { createClient } from '@/lib/supabase/server'
import { Attendee } from '@/lib/types'
import { AttendeeList } from './_components/attendee-list'

export default async function AttendeesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendees')
    .select('*')
    .order('last_name', { ascending: true })

  if (error) {
    console.error('[AttendeesPage] Failed to fetch attendees:', error.message)
  }

  return <AttendeeList attendees={(data as Attendee[]) ?? []} />
}
