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
  meeting_members: Array<{
    user_id: string
    team_members: { display_name: string | null; email: string } | null
  }> | null
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
        .select('id, status, scheduled_at, location, owner_id, attendees(first_name, last_name), meeting_members(user_id, team_members!meeting_members_user_id_fkey(display_name, email))')
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

    const meetings: TimelineMeeting[] = ((meetingsRes.data ?? []) as unknown as MeetingRaw[]).map((m) => {
      // De-dupe member ids (owner is also typically in meeting_members)
      const allUserIds = new Set<string>()
      if (m.owner_id) allUserIds.add(m.owner_id)
      for (const mm of m.meeting_members ?? []) allUserIds.add(mm.user_id)
      const assignees = [...allUserIds].map((uid) => {
        const tm = m.meeting_members?.find((mm) => mm.user_id === uid)?.team_members
        const name = tm?.display_name ?? tm?.email?.split('@')[0] ?? null
        return { user_id: uid, display_name: name }
      })
      return {
        id: m.id,
        status: m.status as MeetingStatus,
        scheduled_at: m.scheduled_at,
        location: m.location,
        owner_id: m.owner_id,
        attendee_name:
          [m.attendees?.first_name, m.attendees?.last_name].filter(Boolean).join(' ') || 'Unknown',
        assignees,
      }
    })

    const teamMembers: TeamMember[] = (teamMembersRes.data ?? []) as TeamMember[]

    if (meetings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3 fade-up">
          <div className="w-14 h-14 rounded-full bg-[var(--color-teal)]/10 flex items-center justify-center">
            <span className="text-2xl">📅</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nothing scheduled yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Book 1:1s in Swapcard — they&apos;ll auto-sync once your iCal is connected on /me.
            </p>
          </div>
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
