import Link from 'next/link'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { MeetingNotesForm } from './_components/meeting-notes-form'
import { ActionItemsSection } from './_components/action-items-section'
import { StatusChanger, StatusBadge } from './_components/status-changer'
import { MeetingMembersSection } from './_components/meeting-members-section'
import { PriorityEditor } from '@/components/priority-editor'
import { safeHttpUrl } from '@/lib/utils'
import type { ActionItem, MeetingStatus, TeamMember } from '@/lib/types'

// Code-split: these components ship as separate chunks. Owner-only dialogs
// (Edit/Delete) and below-the-fold sections (FollowUpDate carries
// react-day-picker, AttendeeProfileSection is the long Swapcard read-out)
// only download their JS when the page actually renders them.
const EditMeetingButton = dynamic(
  () => import('./_components/edit-meeting-button').then((m) => ({ default: m.EditMeetingButton }))
)
const DeleteMeetingButton = dynamic(
  () => import('./_components/delete-meeting-button').then((m) => ({ default: m.DeleteMeetingButton }))
)
const FollowUpDate = dynamic(
  () => import('./_components/follow-up-date').then((m) => ({ default: m.FollowUpDate })),
  { loading: () => <div className="h-10 animate-pulse bg-muted rounded" /> }
)
const AttendeeProfileSection = dynamic(
  () => import('@/app/(app)/attendees/_components/attendee-profile-section').then((m) => ({ default: m.AttendeeProfileSection })),
  { loading: () => <div className="rounded-xl h-64 animate-pulse bg-muted/30 border border-border/60" /> }
)

type MeetingRow = {
  id: string
  attendee_id: string
  owner_id: string | null
  status: MeetingStatus
  scheduled_at: string | null
  duration_minutes: number | null
  location: string | null
  why_relevant: string | null
  talking_points: string | null
  meeting_notes: string | null
  comments: string | null
  follow_up_date: string | null
  ical_uid: string | null
  source: 'manual' | 'ical' | null
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
    { data: meetingRaw, error: meetingErr },
    { data: actionItemsRaw },
    { data: teamMembersRaw },
    { data: meetingMembersRaw },
  ] = await Promise.all([
    supabase
      .from('meetings')
      .select(`
        *,
        attendees ( first_name, last_name ),
        team_members!meetings_owner_id_fkey ( display_name, email )
      `)
      .eq('id', id)
      .maybeSingle(),
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
      .select('user_id, team_members!meeting_members_user_id_fkey(display_name, email)')
      .eq('meeting_id', id),
  ])

  if (meetingErr) {
    // Surface DB error to error.tsx instead of silently 404-ing
    throw new Error(`Meeting fetch failed: ${meetingErr.message}`)
  }
  if (!meetingRaw) notFound()

  // Fetch the full attendee profile + tag assignments to render under the meeting info
  const attendeeId = (meetingRaw as { attendee_id: string }).attendee_id
  const [{ data: attendee }, { data: attendeeTagRows }, { data: allTagsData }] = await Promise.all([
    supabase
      .from('attendees')
      .select('company, job_title, linkedin, priority, biography, expertise, interests, how_others_can_help, how_i_can_help, country, career_stage, seeking_work, recruitment, swapcard_url')
      .eq('id', attendeeId)
      .maybeSingle(),
    supabase.from('attendee_tags').select('tag_id').eq('attendee_id', attendeeId),
    supabase.from('tags').select('id, name, color').order('name'),
  ])

  const assignedTagIds = new Set(((attendeeTagRows ?? []) as Array<{ tag_id: string }>).map((r) => r.tag_id))
  const assignedTags = (((allTagsData ?? []) as Array<{ id: string; name: string; color: string }>)).filter((t) => assignedTagIds.has(t.id))

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
    <div className="max-w-2xl mx-auto md:mx-0 px-4 py-6 md:py-0 space-y-8">
      {/* Back navigation — only useful on mobile where sidebar is hidden */}
      <Link
        href={`/attendees/${meeting.attendee_id}`}
        className="text-sm text-muted-foreground md:hidden block"
      >
        ← Back to {attendeeName}
      </Link>

      {/* Section 1 — Hero header */}
      <div className="hero-header rounded-2xl p-5 md:p-6 space-y-3 fade-up">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge status={meeting.status} />
              {meeting.source === 'ical' && (
                <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)] uppercase tracking-wider">
                  Swapcard
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="editorial-h1 text-3xl md:text-4xl font-bold text-foreground">
                <Link
                  href={`/attendees/${meeting.attendee_id}`}
                  className="hover:text-[var(--color-teal-deep)] transition-colors"
                >
                  {attendeeName}
                </Link>
              </h1>
              {attendee && <PriorityEditor attendeeId={attendeeId} initialPriority={attendee.priority} />}
            </div>
            {attendee && (attendee.company || attendee.job_title || safeHttpUrl(attendee.linkedin)) && (
              <p className="text-base text-foreground/80 mt-1 flex items-center flex-wrap gap-x-2 tracking-tight">
                {(attendee.company || attendee.job_title) && (
                  <span>{[attendee.company, attendee.job_title].filter(Boolean).join(' · ')}</span>
                )}
                {safeHttpUrl(attendee.linkedin) && (
                  <a
                    href={safeHttpUrl(attendee.linkedin)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-teal)] hover:underline inline-flex items-center gap-0.5 font-medium text-sm"
                  >
                    LinkedIn <ExternalLink size={11} />
                  </a>
                )}
              </p>
            )}
            {assignedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {assignedTags.map((t) => (
                  <span
                    key={t.id}
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${t.color}26`, color: t.color }}
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {isOwner && (
            <div className="flex gap-1 shrink-0">
              {meeting.source !== 'ical' && (
                <EditMeetingButton
                  meetingId={id}
                  currentOwnerId={meeting.owner_id}
                  currentScheduledAt={meeting.scheduled_at}
                  currentLocation={meeting.location}
                  currentUserId={user.id}
                  teamMembers={teamMembers}
                />
              )}
              <DeleteMeetingButton meetingId={id} attendeeId={meeting.attendee_id} isIcal={meeting.source === 'ical'} />
            </div>
          )}
        </div>

        {(meeting.scheduled_at || meeting.location) && <hr className="hr-editorial" />}

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
          {meeting.scheduled_at ? (
            <span className="text-foreground font-medium tabular-nums">
              {format(parseISO(meeting.scheduled_at), "EEEE d MMM 'at' HH:mm")}
              {meeting.duration_minutes && (
                <span className="text-muted-foreground font-normal"> · {meeting.duration_minutes} min</span>
              )}
            </span>
          ) : meeting.status === 'want_to_meet' ? (
            <span className="text-muted-foreground italic">Not yet scheduled</span>
          ) : null}
          {meeting.location && (
            <span className="text-muted-foreground">{meeting.location}</span>
          )}
          <span className="text-muted-foreground text-xs ml-auto">
            owned by <span className="text-foreground/80 font-medium">{ownerName}</span>
          </span>
        </div>

        {meeting.source === 'ical' && isOwner && (
          <p className="text-xs text-muted-foreground italic">
            Time and location sync from Swapcard — edit there.
          </p>
        )}
      </div>

      {/* Section 2 — Status actions */}
      {(isOwner && !['done', 'no_show', 'cancelled'].includes(meeting.status)) && (
        <div className="rounded-xl p-4 bg-card border border-border/60 shadow-sm fade-up">
          <p className="editorial-eyebrow text-muted-foreground mb-3">Move status</p>
          <StatusChanger
            meetingId={id}
            currentStatus={meeting.status}
            isOwner={isOwner}
            isIcal={meeting.source === 'ical'}
          />
        </div>
      )}
      {['done', 'no_show', 'cancelled'].includes(meeting.status) && (
        <div className="rounded-xl px-4 py-3 bg-muted/30 border border-border/60">
          <p className="text-xs text-muted-foreground">
            Status is final: <span className="font-medium text-foreground">{STATUS_LABELS[meeting.status]}</span>
          </p>
        </div>
      )}

      {/* Section 3 — Assignees */}
      <div className="rounded-xl p-4 bg-card border border-border/60 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">Also invite</h2>
        <MeetingMembersSection
          meetingId={id}
          initialMembers={meetingMembers}
          allTeamMembers={teamMembers}
        />
      </div>

      {/* Section 4 — Notes (autosave) */}
      <div className="rounded-xl p-4 bg-card border border-border/60 shadow-sm space-y-2">
        <h2 className="text-base font-semibold">Meeting Log</h2>
        <MeetingNotesForm
          meetingId={id}
          initialValues={{
            why_relevant: meeting.why_relevant,
            talking_points: meeting.talking_points,
            meeting_notes: meeting.meeting_notes,
            comments: meeting.comments,
          }}
        />
      </div>

      {/* Section 5 — Action Items */}
      <div className="rounded-xl p-4 bg-card border border-border/60 shadow-sm space-y-3">
        <h2 className="text-base font-semibold">Action Items</h2>
        <ActionItemsSection
          meetingId={id}
          initialItems={actionItems}
        />
      </div>

      {/* Section 6 — Follow-up Date */}
      <div className="rounded-xl p-4 bg-card border border-border/60 shadow-sm">
        <FollowUpDate meetingId={id} initialDate={meeting.follow_up_date} />
      </div>

      {/* Section 7 — Swapcard profile (read-only) */}
      {attendee && <AttendeeProfileSection attendee={attendee} />}
    </div>
  )
}
