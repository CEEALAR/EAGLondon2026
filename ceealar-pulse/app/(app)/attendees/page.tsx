import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Attendee, Tag } from '@/lib/types'
import { AttendeeList } from './_components/attendee-list'

export default async function AttendeesPage() {
  const supabase = await createClient()

  const [
    { data: attendeesData, error },
    { data: allTagsData },
  ] = await Promise.all([
    supabase
      .from('attendees')
      .select('*, attendee_tags(tag_id)')
      .order('last_name', { ascending: true })
      .range(0, 9999),
    supabase.from('tags').select('id, name, color, is_system').order('name'),
  ])

  if (error) {
    console.error('[AttendeesPage] Failed to fetch attendees:', error.message)
  }

  const attendees = (attendeesData as Attendee[]) ?? []
  const allTags = (allTagsData as Tag[]) ?? []

  if (attendees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-base font-medium text-foreground">No attendees imported yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Visit{' '}
          <Link
            href="/admin/import"
            className="text-[var(--color-teal)] underline underline-offset-2"
          >
            /admin/import
          </Link>{' '}
          to upload the Swapcard spreadsheet.
        </p>
      </div>
    )
  }

  return <AttendeeList attendees={attendees} allTags={allTags} />
}
