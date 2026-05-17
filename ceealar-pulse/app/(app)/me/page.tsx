import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { MyActionItems } from './_components/my-action-items'
import { CalendarSection } from './_components/calendar-section'
import { UnmatchedEvents } from './_components/unmatched-events'

type RawActionItem = {
  id: string
  text: string
  done: boolean
  meeting_id: string
  meetings: {
    id: string
    attendees: { first_name: string | null; last_name: string | null } | null
  } | null
}

type WantToMeetRow = {
  id: string
  attendee_id: string
  owner_id: string | null
  attendees: { first_name: string | null; last_name: string | null } | null
  team_members: { display_name: string | null } | null
}

type CalendarRow = {
  url: string
  last_synced_at: string | null
  last_sync_error: string | null
  created_at: string
}

type UnmatchedRow = {
  id: string
  summary: string
  candidate_name: string | null
  start_at: string
  location: string | null
}

type AttendeeMini = {
  id: string
  first_name: string | null
  last_name: string | null
  company: string | null
}

export default async function MePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member } = await (supabase as any)
    .from('team_members')
    .select('display_name, avatar_url, email')
    .eq('id', user.id)
    .single()

  const name = member?.display_name ?? user.email ?? 'Unknown'
  const email = member?.email ?? user.email ?? ''
  const avatarUrl = member?.avatar_url as string | null
  const initial = name[0]?.toUpperCase() ?? '?'

  // My meeting IDs (via meeting_members)
  const { data: myMeetingLinks } = await supabase
    .from('meeting_members')
    .select('meeting_id')
    .eq('user_id', user.id)

  const myMeetingIds = (myMeetingLinks ?? []).map((r: { meeting_id: string }) => r.meeting_id)

  const [actionItemsResult, wantToMeetResult, calendarResult, unmatchedResult] = await Promise.all([
    myMeetingIds.length > 0
      ? supabase
          .from('action_items')
          .select('id, text, done, meeting_id, meetings(id, attendees(first_name, last_name))')
          .in('meeting_id', myMeetingIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),

    myMeetingIds.length > 0
      ? supabase
          .from('meetings')
          .select('id, attendee_id, owner_id, attendees(first_name, last_name), team_members!meetings_owner_id_fkey(display_name)')
          .in('id', myMeetingIds)
          .eq('status', 'want_to_meet')
          .is('scheduled_at', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    admin
      .from('user_ical_urls')
      .select('url, last_synced_at, last_sync_error, created_at')
      .eq('user_id', user.id)
      .maybeSingle(),

    admin
      .from('unmatched_ical_events')
      .select('id, summary, candidate_name, start_at, location')
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .is('resolved_at', null)
      .order('start_at', { ascending: true }),
  ])

  const actionItems = (actionItemsResult.data ?? []) as unknown as RawActionItem[]
  const wantToMeets = (wantToMeetResult.data ?? []) as unknown as WantToMeetRow[]
  const calendar = (calendarResult.data ?? null) as CalendarRow | null
  const unmatchedEvents = (unmatchedResult.data ?? []) as UnmatchedRow[]

  // Fetch lightweight attendee list only if we have unmatched events to resolve
  let attendees: AttendeeMini[] = []
  if (unmatchedEvents.length > 0) {
    const { fetchAllAttendees } = await import('@/lib/fetch-all-attendees')
    attendees = await fetchAllAttendees<AttendeeMini>(admin, 'id, first_name, last_name, company')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Me</h1>

      {/* Profile card */}
      <div className="border rounded-lg p-5 bg-card flex items-center gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[var(--color-teal)]/10 flex items-center justify-center shrink-0">
            <span className="text-xl font-semibold text-[var(--color-teal)]">{initial}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-base truncate">{name}</p>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>
      </div>

      {/* Calendar */}
      <div
        id="calendar"
        className={`border rounded-lg p-4 bg-card space-y-3 ${
          !calendar ? 'ring-2 ring-[var(--color-gold)]/40 ring-offset-2 ring-offset-[var(--color-cream)] shadow-md' : ''
        }`}
      >
        <h2 className="text-base font-semibold flex items-center gap-2">
          Calendar
          {!calendar && (
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[var(--color-gold)]/20 text-[var(--color-gold)]">
              Set up
            </span>
          )}
        </h2>
        <CalendarSection initialCalendar={calendar} />
      </div>

      {/* Unmatched events tray */}
      {unmatchedEvents.length > 0 && (
        <div className="border rounded-lg p-4 bg-card space-y-3">
          <div>
            <h2 className="text-base font-semibold">Unmatched calendar events</h2>
            <p className="text-xs text-muted-foreground">Pick the right attendee, or dismiss</p>
          </div>
          <UnmatchedEvents events={unmatchedEvents} attendees={attendees} />
        </div>
      )}

      {/* Action items */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <h2 className="text-base font-semibold">Action Items</h2>
        {actionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No action items yet — they show up here when someone tags one to you on a meeting.</p>
        ) : (
          <MyActionItems initialItems={actionItems} />
        )}
      </div>

      {/* Want to meet (unscheduled) */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <h2 className="text-base font-semibold">Want to Meet</h2>
        <p className="text-xs text-muted-foreground -mt-1">Assigned to you, no time set yet</p>
        {wantToMeets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No want-to-meets yet — flag one from an attendee&apos;s page.</p>
        ) : (
          <ul className="space-y-2">
            {wantToMeets.map((m) => {
              const atName = [m.attendees?.first_name, m.attendees?.last_name].filter(Boolean).join(' ') || 'Unknown'
              const ownerLabel = m.owner_id === user.id ? 'You' : (m.team_members?.display_name ?? 'Someone')
              return (
                <li key={m.id}>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="flex items-center justify-between border rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium">{atName}</span>
                    <span className="text-xs text-muted-foreground">via {ownerLabel}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Tags */}
      <div className="border rounded-lg p-4 bg-card flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">Tags</p>
          <p className="text-sm text-muted-foreground">Create and manage your custom tags</p>
        </div>
        <Link
          href="/me/tags"
          className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
        >
          Manage Tags
        </Link>
      </div>
    </div>
  )
}
