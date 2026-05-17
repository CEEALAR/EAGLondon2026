import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { MeetingNotesForm } from './_components/meeting-notes-form'
import { ActionItemsSection } from './_components/action-items-section'
import { StatusChanger } from './_components/status-changer'
import { FollowUpDate } from './_components/follow-up-date'
import { DeleteMeetingButton } from './_components/delete-meeting-button'
import { EditMeetingButton } from './_components/edit-meeting-button'
import { MeetingMembersSection } from './_components/meeting-members-section'
import type { ActionItem, MeetingStatus, TeamMember } from '@/lib/types'

type MeetingRow = {
  id: string
  attendee_id: string
  owner_id: string | null
  status: MeetingStatus
  scheduled_at: string | null
  duration_minutes: number | null
  location: string | null
  prep_note: string | null
  summary: string | null
  meeting_notes: string | null
  comments: string | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
  // joined
  attendees: { first_name: string | null; last_name: string | null } | null
  team_members: { display_name: string | null; email: string } | null
}

const STATUS_LABELS: Record<MeetingStatus, string> = {
  want_to_meet: 'Want to Meet',
  planned:      'Planned',
  done:         'Done',
  no_show:      'No Show',
  cancelled:    'Cancelled',
}

export default async function MeetingDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [
    { data: meetingRaw },
    { data: actionItemsRaw },
    { data: teamMembersRaw },
    { data: meetingMembersRaw },
  ] = await Promise.all([
    supabase
      .from('meetings_view')
      .select(`
        *,
        attendees ( first_name, last_name ),
        team_members ( display_name, email )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('action_items')
      .select('*')
      .eq('meeting_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('team_members')
      .select('id, display_name, email'),
    supabase
      .from('meeting_members')
      .select('user_id, team_members(display_name, email)')
      .eq('meeting_id', id),
  ])

  if (!meetingRaw) notFound()

  const meeting = meetingRaw as unknown as MeetingRow
  const actionItems: ActionItem[] = (actionItemsRaw ?? []) as ActionItem[]
  const teamMembers: TeamMember[] = (teamMembersRaw ?? []) as TeamMember[]
  const meetingMembers = ((meetingMembersRaw ?? []) as unknown as Array<{
    user_id: string
    team_members: { display_name: string | null; email: string } | null
  }>).map((r) => ({
    user_id: r.user_id,
    display_name: r.team_members?.display_name ?? null,
    email: r.team_members?.email ?? '',
  }))

  const attendeeName =
    [meeting.attendees?.first_name, meeting.attendees?.last_name].filter(Boolean).join(' ') ||
    'Unknown Attendee'

  const ownerName =
    meeting.team_members?.display_name ?? meeting.team_members?.email ?? 'Unknown'

  const isOwner = user.id === meeting.owner_id

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* Back navigation */}
      <Link
        href={`/attendees/${meeting.attendee_id}`}
        className="text-sm text-muted-foreground"
      >
        ← Back to {attendeeName}
      </Link>

      {/* Section 1 — Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-bold">
            <Link
              href={`/attendees/${meeting.attendee_id}`}
              className="hover:underline underline-offset-4"
            >
              {attendeeName}
            </Link>
          </h1>
          {isOwner && (
            <div className="flex gap-1 shrink-0 pt-1">
              <EditMeetingButton
                meetingId={id}
                currentOwnerId={meeting.owner_id}
                currentScheduledAt={meeting.scheduled_at}
                currentLocation={meeting.location}
                currentUserId={user.id}
                teamMembers={teamMembers}
              />
              <DeleteMeetingButton meetingId={id} attendeeId={meeting.attendee_id} />
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Meeting owned by {ownerName}</p>

        {meeting.scheduled_at && (
          <p className="text-sm text-foreground">
            {format(parseISO(meeting.scheduled_at), "EEEE d MMM yyyy 'at' HH:mm")}
            {meeting.duration_minutes && ` · ${meeting.duration_minutes} min`}
          </p>
        )}
        {meeting.location && (
          <p className="text-sm text-muted-foreground">{meeting.location}</p>
        )}
        {!meeting.scheduled_at && meeting.status === 'want_to_meet' && (
          <p className="text-sm text-muted-foreground italic">Not yet scheduled</p>
        )}
      </div>

      {/* Section 2 — Status Changer */}
      <div className="border rounded-lg p-4 bg-card space-y-2">
        <h2 className="text-base font-semibold">Status</h2>
        <StatusChanger
          meetingId={id}
          currentStatus={meeting.status}
          isOwner={isOwner}
        />
        {['done', 'no_show', 'cancelled'].includes(meeting.status) && (
          <p className="text-xs text-muted-foreground">
            Status is final: {STATUS_LABELS[meeting.status]}
          </p>
        )}
      </div>

      {/* Section 3 — Assignees */}
      <div className="border rounded-lg p-4 bg-card space-y-2">
        <h2 className="text-base font-semibold">Assigned to</h2>
        <MeetingMembersSection
          meetingId={id}
          initialMembers={meetingMembers}
          allTeamMembers={teamMembers}
        />
      </div>

      {/* Section 4 — Notes (autosave) */}
      <div className="border rounded-lg p-4 bg-card space-y-2">
        <h2 className="text-base font-semibold">Meeting Log</h2>
        <MeetingNotesForm
          meetingId={id}
          isOwner={isOwner}
          status={meeting.status}
          initialValues={{
            prep_note: meeting.prep_note,
            summary: meeting.summary,
            meeting_notes: meeting.meeting_notes,
            comments: meeting.comments,
          }}
        />
      </div>

      {/* Section 5 — Action Items */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <h2 className="text-base font-semibold">Action Items</h2>
        <ActionItemsSection
          meetingId={id}
          initialItems={actionItems}
        />
      </div>

      {/* Section 6 — Follow-up Date */}
      <div className="border rounded-lg p-4 bg-card">
        <FollowUpDate meetingId={id} initialDate={meeting.follow_up_date} />
      </div>
    </div>
  )
}
