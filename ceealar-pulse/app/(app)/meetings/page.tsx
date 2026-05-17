import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { MeetingStatus, TeamMember } from '@/lib/types'
import { MeetingsTimeline, type TimelineMeeting } from './_components/meetings-timeline'
import { MyDayPanel } from './_components/my-day-panel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: meetingsRaw },
    { data: teamMembersRaw },
  ] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, status, scheduled_at, location, owner_id, attendees(first_name, last_name)')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', '2026-05-29T00:00:00+00:00')
      .lte('scheduled_at', '2026-05-31T23:59:59+00:00')
      .order('scheduled_at'),
    supabase.from('team_members').select('id, display_name, email').order('display_name'),
  ])

  type MeetingRaw = {
    id: string
    status: string
    scheduled_at: string
    location: string | null
    owner_id: string | null
    attendees: { first_name: string | null; last_name: string | null } | null
  }

  const meetings: TimelineMeeting[] = ((meetingsRaw ?? []) as unknown as MeetingRaw[]).map((m) => ({
    id: m.id,
    status: m.status as MeetingStatus,
    scheduled_at: m.scheduled_at,
    location: m.location,
    owner_id: m.owner_id,
    attendee_name:
      [m.attendees?.first_name, m.attendees?.last_name].filter(Boolean).join(' ') ||
      'Unknown',
  }))

  const teamMembers: TeamMember[] = (teamMembersRaw ?? []) as TeamMember[]

  return (
    <div className="px-3 py-4">
      <h1 className="text-xl font-semibold mb-4 text-foreground">Schedule</h1>
      {user && <MyDayPanel userId={user.id} />}
      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-base font-medium text-foreground">No meetings yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Find someone in Attendees and tap &lsquo;Schedule meeting&rsquo; to add one.
          </p>
          <Link
            href="/attendees"
            className="text-[var(--color-teal)] underline underline-offset-2 text-sm mt-2"
          >
            Browse Attendees
          </Link>
        </div>
      ) : (
        <MeetingsTimeline meetings={meetings} teamMembers={teamMembers} />
      )}
    </div>
  )
}
