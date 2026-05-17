import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { StrategicContextForm } from '@/app/(app)/attendees/_components/strategic-context-form'
import { MeetingCreateDialog } from '@/app/(app)/attendees/_components/meeting-create-dialog'
import { AssignColleagueButton } from '@/app/(app)/attendees/_components/assign-colleague-button'
import type { TeamMember, MeetingStatus } from '@/lib/types'
import { AttendeeTagsSection } from './_components/attendee-tags-section'
import type { Tag } from '@/lib/types'

type MeetingRow = {
  id: string
  status: MeetingStatus
  scheduled_at: string | null
  location: string | null
  owner_id: string | null
  team_members: { display_name: string | null } | null
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
      .select('id, status, scheduled_at, location, owner_id, team_members(display_name)')
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

  // Soft conflict detection (SCHED-04 + SCHED-05)
  const otherMemberNames = [
    ...new Set(
      meetings
        .filter((m) => m.owner_id && m.owner_id !== user?.id)
        .map((m) => m.team_members?.display_name ?? 'Someone')
    ),
  ]

  const wantToMeetOwners = [
    ...new Set(
      meetings
        .filter((m) => m.status === 'want_to_meet' && m.owner_id !== user?.id)
        .map((m) => m.team_members?.display_name ?? 'Someone')
    ),
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* Back navigation */}
      <Link href="/attendees" className="text-sm text-muted-foreground">
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

      {/* Section 1 — Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{fullName}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        {attendee.career_stage && (
          <p className="text-sm text-muted-foreground">{attendee.career_stage}</p>
        )}
        <div className="pt-2 flex flex-wrap gap-2">
          {user && (
            <MeetingCreateDialog
              attendeeId={attendee.id}
              attendeeName={fullName}
              currentUserId={user.id}
              teamMembers={teamMembers}
              wantToMeetOwners={wantToMeetOwners}
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

      {/* Section 2 — Swapcard Profile */}
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

        <ProfileField label="Seeking Work">
          {attendee.seeking_work === true
            ? 'Yes'
            : attendee.seeking_work === false
            ? 'No'
            : '-'}
        </ProfileField>

        <ProfileField label="Recruitment">{attendee.recruitment ?? '-'}</ProfileField>

        <ProfileField label="Swapcard">
          <a
            href={attendee.swapcard_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            View on Swapcard
            <ExternalLink size={12} />
          </a>
        </ProfileField>

        <ProfileField label="LinkedIn">
          {attendee.linkedin ? (
            <a
              href={attendee.linkedin}
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

      {/* Section 3 — CEEALAR Strategic Context */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-4">CEEALAR Strategic Context</h2>
        <StrategicContextForm
          attendeeId={attendee.id}
          initialValues={{
            why_they_matter: attendee.why_they_matter,
            how_to_engage: attendee.how_to_engage,
            hypothesis: attendee.hypothesis,
            risks: attendee.risks,
            collaboration_hooks: attendee.collaboration_hooks,
          }}
        />
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
                      {m.team_members?.display_name ?? 'Unknown'}
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
