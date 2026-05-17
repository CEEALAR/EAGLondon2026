/**
 * Server component: fetches the team's meetings + members and renders the
 * timeline. Used by both /meetings (full-width on mobile, left column on
 * desktop) and as the persistent left column for /meetings/[id] on desktop.
 */

import { createClient } from '@/lib/supabase/server'
import type { MeetingStatus, TeamMember } from '@/lib/types'
import { MeetingsTimeline, type TimelineMeeting } from './meetings-timeline'

type MeetingRaw = {
  id: string
  status: string
  scheduled_at: string
  location: string | null
  owner_id: string | null
  attendees: { first_name: string | null; last_name: string | null } | null
}

export async function MeetingsSidebar() {
  const supabase = await createClient()

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

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-sm text-muted-foreground">No meetings yet</p>
      </div>
    )
  }

  return <MeetingsTimeline meetings={meetings} teamMembers={teamMembers} />
}
