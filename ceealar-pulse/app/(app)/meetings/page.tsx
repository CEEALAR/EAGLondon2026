import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'
import type { MeetingStatus } from '@/lib/types'

type MeetingListRow = {
  id: string
  status: MeetingStatus
  scheduled_at: string | null
  location: string | null
  attendees: { first_name: string | null; last_name: string | null } | null
  team_members: { display_name: string | null } | null
}

const STATUS_LABELS: Record<MeetingStatus, string> = {
  want_to_meet: 'Want to Meet',
  planned: 'Planned',
  done: 'Done',
  no_show: 'No Show',
  cancelled: 'Cancelled',
}

const STATUS_CLASSES: Record<MeetingStatus, string> = {
  want_to_meet: 'bg-gray-100 text-gray-700',
  planned: 'bg-teal-100 text-teal-800',
  done: 'bg-yellow-100 text-yellow-800',
  no_show: 'bg-gray-200 text-gray-500',
  cancelled: 'bg-gray-200 text-gray-500',
}

export default async function MeetingsPage() {
  const supabase = await createClient()

  const { data: meetingsRaw } = await supabase
    .from('meetings')
    .select(`
      id, status, scheduled_at, location,
      attendees ( first_name, last_name ),
      team_members ( display_name )
    `)
    .order('created_at', { ascending: false })

  const meetings: MeetingListRow[] = (meetingsRaw ?? []) as unknown as MeetingListRow[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Meetings</h1>

      {meetings.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-card">
          <p className="text-muted-foreground text-sm">
            No meetings yet — find someone in{' '}
            <Link href="/attendees" className="underline underline-offset-4">
              Attendees
            </Link>{' '}
            and tap &quot;Schedule Meeting&quot;.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {meetings.map((m) => {
            const attendeeName =
              [m.attendees?.first_name, m.attendees?.last_name].filter(Boolean).join(' ') ||
              'Unknown Attendee'
            return (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors bg-card"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{attendeeName}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[m.status]}`}
                    >
                      {STATUS_LABELS[m.status]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-3">
                    {m.team_members?.display_name && (
                      <span>{m.team_members.display_name}</span>
                    )}
                    {m.scheduled_at && (
                      <span>
                        {format(parseISO(m.scheduled_at), "EEE d MMM 'at' HH:mm")}
                      </span>
                    )}
                    {m.location && <span>{m.location}</span>}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {/* Phase 5: timeline view here */}
    </div>
  )
}
