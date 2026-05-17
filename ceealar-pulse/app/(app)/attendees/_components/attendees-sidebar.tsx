/**
 * Server component: fetches attendees + tags and renders the virtualized
 * AttendeeList. Shared by /attendees and /attendees/[id] on desktop.
 */

import { createClient } from '@/lib/supabase/server'
import { fetchAllAttendees } from '@/lib/fetch-all-attendees'
import type { Attendee, Tag, TeamMember } from '@/lib/types'
import { AttendeeList } from './attendee-list'

export async function AttendeesSidebar() {
  const supabase = await createClient()

  const [attendees, { data: allTagsData }, { data: teamMembersData }, { data: meetingsData }] = await Promise.all([
    fetchAllAttendees<Attendee>(supabase, '*, attendee_tags(tag_id)'),
    supabase.from('tags').select('id, name, color, is_system').order('name'),
    supabase.from('team_members').select('id, email, display_name').order('display_name'),
    // Every active assignment — drives the "assigned to" pill on each row and
    // the new "Assigned to" filter. Excludes cancelled/no_show. The
    // meeting_members embed captures all assignees, not just owners.
    supabase
      .from('meetings')
      .select('attendee_id, status, owner_id, meeting_members(user_id)')
      .not('status', 'in', '(cancelled,no_show)'),
  ])

  const allTags = (allTagsData as Tag[]) ?? []
  const teamMembers = (teamMembersData as TeamMember[]) ?? []

  // Build attendee_id -> [user_id, ...] (owner ∪ all meeting_members, deduped)
  type MeetingAssignRow = {
    attendee_id: string
    status: string
    owner_id: string | null
    meeting_members: Array<{ user_id: string }> | null
  }
  const assignments: Record<string, string[]> = {}
  for (const m of ((meetingsData ?? []) as unknown as MeetingAssignRow[])) {
    const set = new Set(assignments[m.attendee_id] ?? [])
    if (m.owner_id) set.add(m.owner_id)
    for (const mm of m.meeting_members ?? []) set.add(mm.user_id)
    assignments[m.attendee_id] = [...set]
  }

  return (
    <AttendeeList
      attendees={attendees}
      allTags={allTags}
      teamMembers={teamMembers}
      assignments={assignments}
    />
  )
}
