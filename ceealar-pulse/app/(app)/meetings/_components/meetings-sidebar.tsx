/**
 * Server component: fetches the team's meetings + members and renders the
 * timeline. Used by both /meetings and /meetings/[id] (sidebar on desktop).
 *
 * Wraps the fetch in try/catch and renders an inline error rather than
 * throwing — failures here shouldn't break the parent page.
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
  try {
    const supabase = await createClient()

    const [
      meetingsRes,
      teamMembersRes,
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

    if (meetingsRes.error) {
      return <SidebarError msg={meetingsRes.error.message} />
    }
    if (teamMembersRes.error) {
      return <SidebarError msg={teamMembersRes.error.message} />
    }

    const meetings: TimelineMeeting[] = ((meetingsRes.data ?? []) as unknown as MeetingRaw[]).map((m) => ({
      id: m.id,
      status: m.status as MeetingStatus,
      scheduled_at: m.scheduled_at,
      location: m.location,
      owner_id: m.owner_id,
      attendee_name:
        [m.attendees?.first_name, m.attendees?.last_name].filter(Boolean).join(' ') ||
        'Unknown',
    }))

    const teamMembers: TeamMember[] = (teamMembersRes.data ?? []) as TeamMember[]

    if (meetings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <p className="text-sm text-muted-foreground">No meetings yet</p>
        </div>
      )
    }

    return <MeetingsTimeline meetings={meetings} teamMembers={teamMembers} />
  } catch (e) {
    return <SidebarError msg={e instanceof Error ? e.message : String(e)} />
  }
}

function SidebarError({ msg }: { msg: string }) {
  return (
    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3 m-3">
      Schedule failed to load: {msg}
    </div>
  )
}
