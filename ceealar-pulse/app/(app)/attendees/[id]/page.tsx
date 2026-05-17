import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { AttendeeActions } from '@/app/(app)/attendees/_components/attendee-actions'
import { AssignColleagueButton } from '@/app/(app)/attendees/_components/assign-colleague-button'
import { MeetingNotesForm } from '@/app/(app)/meetings/[id]/_components/meeting-notes-form'
import { PriorityEditor } from '@/components/priority-editor'
import { safeHttpUrl } from '@/lib/utils'
import type { TeamMember, MeetingStatus } from '@/lib/types'
import { AttendeeTagsSection } from './_components/attendee-tags-section'
import type { Tag } from '@/lib/types'

type MeetingRow = {
  id: string
  status: MeetingStatus
  scheduled_at: string | null
  location: string | null
  owner_id: string | null
  why_relevant: string | null
  talking_points: string | null
  meeting_notes: string | null
  comments: string | null
  created_at: string
  team_members: { display_name: string | null } | null
  meeting_members: Array<{
    user_id: string
    team_members: { display_name: string | null; email: string } | null
  }> | null
}

function statusLabel(s: MeetingStatus) {
  const map: Record<MeetingStatus, string> = {
    want_to_meet: 'Want to Meet',
    planned: 'Planned',
    done: 'Done',
    no_show: 'No Show',
    cancelled: 'Cancelled',
  }
  return map[s] ?? s
}

function statusClass(s: MeetingStatus) {
  switch (s) {
    case 'want_to_meet': return 'bg-gray-100 text-gray-700'
    case 'planned':      return 'bg-teal-100 text-teal-800'
    case 'done':         return 'bg-yellow-100 text-yellow-800'
    default:             return 'bg-gray-100 text-gray-500'
  }
}

export default async function AttendeeDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: attendee },
    { data: teamMembersRaw },
    { data: meetingsRaw },
  ] = await Promise.all([
    supabase.from('attendees').select('*, attendee_tags(tag_id)').eq('id', id).single(),
    supabase.from('team_members').select('*').order('display_name'),
    supabase
      .from('meetings')
      .select('id, status, scheduled_at, location, owner_id, why_relevant, talking_points, meeting_notes, comments, created_at, team_members!meetings_owner_id_fkey(display_name), meeting_members(user_id, team_members!meeting_members_user_id_fkey(display_name, email))')
      .eq('attendee_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!attendee) {
    notFound()
  }

  const { data: allTagsData } = await supabase.from('tags').select('*').order('name')
  const allTags: Tag[] = allTagsData ?? []
  const assignedTagIds = new Set((attendee.attendee_tags ?? []).map((at: { tag_id: string }) => at.tag_id))
  const assignedTags: Tag[] = allTags.filter(t => assignedTagIds.has(t.id))

  const fullName =
    [attendee.first_name, attendee.last_name].filter(Boolean).join(' ') ||
    attendee.swapcard_url

  const subtitle = [attendee.company, attendee.job_title].filter(Boolean).join(' · ')

  const teamMembers: TeamMember[] = (teamMembersRaw ?? []) as TeamMember[]
  const meetings: MeetingRow[] = (meetingsRaw ?? []) as unknown as MeetingRow[]

  // "Primary" meeting for the Meeting Log section on this attendee page:
  // prefer planned/done meetings (active), then want_to_meet, then anything;
  // within each tier, take the most recently created.
  const STATUS_RANK: Record<MeetingStatus, number> = {
    planned:      0,
    done:         1,
    want_to_meet: 2,
    no_show:      3,
    cancelled:    4,
  }
  const primaryMeeting = [...meetings].sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status]
    if (r !== 0) return r
    return b.created_at.localeCompare(a.created_at)
  })[0] ?? null

  // Soft conflict detection (SCHED-04 + SCHED-05)
  const otherMemberNames = [
    ...new Set(
      meetings
        .filter((m) => m.owner_id && m.owner_id !== user?.id)
        .map((m) => m.team_members?.display_name ?? 'Someone')
    ),
  ]

  return (
    <div className="max-w-2xl mx-auto md:mx-0 px-4 md:px-6 py-6 space-y-8">
      {/* Back navigation — only on mobile where the sidebar isn't visible */}
      <Link href="/attendees" className="text-sm text-muted-foreground md:hidden block">
        ← Back to attendees
      </Link>

      {/* Soft conflict banner (SCHED-04) */}
      {otherMemberNames.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <span className="text-amber-500 text-sm mt-0.5">⚠</span>
          <p className="text-sm text-amber-800">
            {otherMemberNames.join(', ')}{' '}
            {otherMemberNames.length === 1 ? 'also has' : 'also have'} a meeting with this person.
          </p>
        </div>
      )}

      {/* Section 1 — Hero header (glass card + initials avatar) */}
      <div className="hero-header rounded-2xl p-5 md:p-6 fade-up">
        <div className="flex items-start gap-4">
          {/* Large gradient avatar with initials */}
          <div
            className="hidden sm:flex shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl items-center justify-center text-white font-semibold text-xl md:text-2xl tracking-tight ring-1 ring-black/5 shadow-md"
            style={{
              backgroundImage: 'linear-gradient(135deg, #14958B 0%, #0B5953 100%)',
            }}
            aria-hidden
          >
            {(attendee.first_name?.[0] ?? '?').toUpperCase()}
            {(attendee.last_name?.[0] ?? '').toUpperCase()}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start gap-2 flex-wrap">
              <h1 className="editorial-h1 text-3xl md:text-4xl font-bold text-foreground">
                {fullName}
              </h1>
              <PriorityEditor attendeeId={attendee.id} initialPriority={attendee.priority} />
            </div>
            {subtitle && (
              <p className="text-base text-foreground/80 tracking-tight">{subtitle}</p>
            )}
            {(attendee.career_stage || safeHttpUrl(attendee.linkedin)) && (
              <p className="text-sm text-muted-foreground flex items-center flex-wrap gap-x-3 gap-y-1 pt-0.5">
                {attendee.career_stage && <span>{attendee.career_stage}</span>}
                {safeHttpUrl(attendee.linkedin) && (
                  <a
                    href={safeHttpUrl(attendee.linkedin)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-teal)] hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    LinkedIn <ExternalLink size={11} />
                  </a>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-border/40 flex flex-wrap gap-2">
          {user && (
            <AttendeeActions
              attendeeId={attendee.id}
              swapcardUrl={attendee.swapcard_url}
              currentUserId={user.id}
              existingWantToMeet={meetings.find(
                (m) => m.owner_id === user.id && m.status === 'want_to_meet'
              ) ? { id: meetings.find((m) => m.owner_id === user.id && m.status === 'want_to_meet')!.id } : null}
            />
          )}
          {user && (
            <AssignColleagueButton
              attendeeId={attendee.id}
              currentUserId={user.id}
              teamMembers={teamMembers}
            />
          )}
        </div>
      </div>

      {/* Section 2 — Meeting Log (edits the primary meeting with this attendee) */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Meeting Log</h2>
          {primaryMeeting ? (
            <Link
              href={`/meetings/${primaryMeeting.id}`}
              className="text-xs text-[var(--color-teal)] hover:underline shrink-0"
            >
              Open meeting →
            </Link>
          ) : null}
        </div>
        {primaryMeeting ? (
          <>
            <p className="text-xs text-muted-foreground -mt-1">
              Editing the {statusLabel(primaryMeeting.status).toLowerCase()} meeting with{' '}
              {[attendee.first_name, attendee.last_name].filter(Boolean).join(' ')}
              {primaryMeeting.scheduled_at &&
                ` · ${format(parseISO(primaryMeeting.scheduled_at), "d MMM 'at' HH:mm")}`}
            </p>
            <MeetingNotesForm
              meetingId={primaryMeeting.id}
              initialValues={{
                why_relevant: primaryMeeting.why_relevant,
                talking_points: primaryMeeting.talking_points,
                meeting_notes: primaryMeeting.meeting_notes,
                comments: primaryMeeting.comments,
              }}
            />
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No meeting yet. Use{' '}
              <span className="font-medium text-foreground">Schedule in Swapcard</span>,{' '}
              <span className="font-medium text-foreground">Want to meet</span>, or{' '}
              <span className="font-medium text-foreground">Assign to colleague</span> above to start one.
            </p>
          </div>
        )}
      </div>

      {/* Section 3 — Swapcard Profile */}
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <h2 className="text-lg font-semibold mb-3">Profile</h2>

        <ProfileField label="Biography">
          <span className="whitespace-pre-wrap">
            {attendee.biography ?? '-'}
          </span>
        </ProfileField>

        <ProfileField label="Areas of Expertise">
          {attendee.expertise?.length ? attendee.expertise.join(', ') : '-'}
        </ProfileField>

        <ProfileField label="Areas of Interest">
          {attendee.interests?.length ? attendee.interests.join(', ') : '-'}
        </ProfileField>

        <ProfileField label="How Others Can Help Me">
          <span className="whitespace-pre-wrap">
            {attendee.how_others_can_help ?? '-'}
          </span>
        </ProfileField>

        <ProfileField label="How I Can Help Others">
          <span className="whitespace-pre-wrap">
            {attendee.how_i_can_help ?? '-'}
          </span>
        </ProfileField>

        <ProfileField label="Country">{attendee.country ?? '-'}</ProfileField>

        <ProfileField label="Career Stage">{attendee.career_stage ?? '-'}</ProfileField>

        <ProfileField label="Seeking Work">{attendee.seeking_work ?? '-'}</ProfileField>

        <ProfileField label="Recruitment">{attendee.recruitment ?? '-'}</ProfileField>

        <ProfileField label="Swapcard">
          {safeHttpUrl(attendee.swapcard_url) ? (
            <a
              href={safeHttpUrl(attendee.swapcard_url)!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              View on Swapcard
              <ExternalLink size={12} />
            </a>
          ) : (
            '-'
          )}
        </ProfileField>

        <ProfileField label="LinkedIn">
          {safeHttpUrl(attendee.linkedin) ? (
            <a
              href={safeHttpUrl(attendee.linkedin)!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              View on LinkedIn
              <ExternalLink size={12} />
            </a>
          ) : (
            '-'
          )}
        </ProfileField>
      </div>

      {/* Section 4 — Tags */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-2">Tags</h2>
        <AttendeeTagsSection attendeeId={attendee.id} initialTags={assignedTags} />
      </div>

      {/* Section 5 — Team Meetings */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-3">Team Meetings</h2>
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No meetings yet — tap &quot;Schedule Meeting&quot; above to create one.
          </p>
        ) : (
          <ul className="space-y-2">
            {meetings.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass(m.status)}`}
                    >
                      {statusLabel(m.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const ids = new Set<string>()
                        if (m.owner_id) ids.add(m.owner_id)
                        for (const mm of m.meeting_members ?? []) ids.add(mm.user_id)
                        if (ids.size === 0) return m.team_members?.display_name ?? 'Unknown'
                        return [...ids]
                          .map((uid) => {
                            const tm = m.meeting_members?.find((mm) => mm.user_id === uid)?.team_members
                            return (tm?.display_name ?? tm?.email?.split('@')[0] ?? 'Someone').split(' ')[0]
                          })
                          .join(', ')
                      })()}
                    </span>
                  </div>
                  {m.scheduled_at && (
                    <p className="text-sm mt-1">
                      {format(parseISO(m.scheduled_at), "EEE d MMM yyyy 'at' HH:mm")}
                    </p>
                  )}
                  {m.location && (
                    <p className="text-xs text-muted-foreground mt-0.5">{m.location}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ProfileField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{children}</p>
    </div>
  )
}
