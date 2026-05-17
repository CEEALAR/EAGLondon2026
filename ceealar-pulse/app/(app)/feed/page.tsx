import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { FeedFilter } from './_components/feed-filter'

export const dynamic = 'force-dynamic'

type ActivityRow = {
  id: string
  action: string
  created_at: string
  actor_id: string | null
  meeting_id: string | null
  attendee_id: string | null
  detail: Record<string, unknown> | null
  team_members: { display_name: string | null } | null
  attendees: { first_name: string | null; last_name: string | null } | null
  meetings: { scheduled_at: string | null } | null
}

function formatActivity(row: ActivityRow): string {
  const actor = row.team_members?.display_name ?? 'Someone'
  const attendeeName =
    [row.attendees?.first_name, row.attendees?.last_name].filter(Boolean).join(' ') ||
    'an attendee'

  switch (row.action) {
    case 'meeting_created': {
      const scheduledAt = row.meetings?.scheduled_at
      if (scheduledAt) {
        const d = new Date(scheduledAt)
        const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
        return `${actor} scheduled a meeting with ${attendeeName} for ${dateStr} at ${timeStr}`
      }
      return `${actor} flagged ${attendeeName} as 'Want to Meet'`
    }
    case 'status_done':
      return `${actor} marked their meeting with ${attendeeName} as done`
    case 'action_item_added':
      return `${actor} added an action item for ${attendeeName}`
    case 'action_item_completed':
      return `${actor} completed an action item for ${attendeeName}`
    default:
      return `${actor} updated a meeting`
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  // Capture the previous last-seen so we can highlight rows newer than it,
  // then bump it to 'now' so the badge clears on this visit.
  let previousLastSeen: string | null = null
  if (userId) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: tm } = await admin
      .from('team_members')
      .select('feed_last_seen_at')
      .eq('id', userId)
      .maybeSingle()
    previousLastSeen = (tm?.feed_last_seen_at as string | null) ?? null
    await admin
      .from('team_members')
      .update({ feed_last_seen_at: new Date().toISOString() })
      .eq('id', userId)
  }

  const [activityRes, myMembersRes] = await Promise.all([
    supabase
      .from('activity')
      .select(
        'id, action, created_at, actor_id, meeting_id, attendee_id, detail, team_members(display_name), attendees(first_name, last_name), meetings(scheduled_at)'
      )
      .order('created_at', { ascending: false })
      .limit(100),
    userId
      ? supabase.from('meeting_members').select('meeting_id').eq('user_id', userId)
      : Promise.resolve({ data: [] as Array<{ meeting_id: string }> }),
  ])

  const activities = (activityRes.data ?? []) as unknown as ActivityRow[]
  const myMeetingIds = new Set(
    ((myMembersRes.data ?? []) as Array<{ meeting_id: string }>).map((r) => r.meeting_id)
  )

  // Group + tag for the client filter
  const rows = activities.map((row) => {
    const involvesMe = !!(userId && row.meeting_id && myMeetingIds.has(row.meeting_id) && row.actor_id !== userId)
    const isMine = !!(userId && row.actor_id === userId)
    const isUnread = !!(involvesMe && previousLastSeen && row.created_at > previousLastSeen)

    const href = row.meeting_id
      ? `/meetings/${row.meeting_id}`
      : row.attendee_id
      ? `/attendees/${row.attendee_id}`
      : null

    const rowClasses = [
      'block px-4 py-3 transition-colors',
      involvesMe ? 'bg-[var(--color-teal)]/6 hover:bg-[var(--color-teal)]/10' : 'hover:bg-muted/50',
      isUnread ? 'border-l-2 border-l-[var(--color-gold)]' : 'border-l-2 border-l-transparent',
    ].join(' ')

    const content = (
      <>
        <div className="flex items-start gap-2">
          {involvesMe && (
            <span
              aria-label="about you"
              className="mt-1.5 shrink-0 inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-teal)]"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">{formatActivity(row)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {relativeTime(row.created_at)}
              {isUnread && (
                <span className="ml-2 inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-1 py-0 rounded bg-[var(--color-gold)]/20 text-[var(--color-gold)]">
                  New
                </span>
              )}
            </p>
          </div>
        </div>
      </>
    )

    return {
      id: row.id,
      involvesMe,
      isMine,
      node: href ? (
        <Link href={href} className={rowClasses}>{content}</Link>
      ) : (
        <div className={rowClasses}>{content}</div>
      ),
    }
  })

  // Group visually by day (purely cosmetic dividers in the filter's flat list)
  const groups: Array<{ label: string; rows: typeof rows }> = []
  for (const row of rows) {
    const activity = activities.find((a) => a.id === row.id)!
    const label = dayLabel(activity.created_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.rows.push(row)
    } else {
      groups.push({ label, rows: [row] })
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Feed</h1>
        <p className="text-xs text-muted-foreground">{activities.length} recent · last 100</p>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center fade-up">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted/60 flex items-center justify-center mb-3">
            <span className="text-2xl">📰</span>
          </div>
          <p className="text-sm text-muted-foreground">
            No activity yet — create a meeting or mark one as done to see it here.
          </p>
        </div>
      ) : (
        // Day separators rendered inline in the FeedFilter via interleaved items
        <FeedFilter
          rows={groups.flatMap((g) => [
            {
              id: `__day-${g.label}`,
              involvesMe: false,
              isMine: false,
              node: (
                <div className="px-4 py-1.5 bg-muted/30 border-y border-border/60">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {g.label}
                  </p>
                </div>
              ),
            },
            ...g.rows,
          ])}
        />
      )}
    </div>
  )
}
