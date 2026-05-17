import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { FeedFilter } from './_components/feed-filter'
import { ActivityIcon } from './_components/activity-icon'

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

// Deterministic 2-letter initials + gradient for the actor avatar
function avatarFor(name: string | null): { initials: string; gradient: string } {
  if (!name) return { initials: '?', gradient: 'linear-gradient(135deg, #94a3b8, #475569)' }
  const parts = name.split(/\s+/).filter(Boolean)
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  const PALETTES = [
    'linear-gradient(135deg, #14958B, #0B5953)',
    'linear-gradient(135deg, #E8B73E, #B8870E)',
    'linear-gradient(135deg, #6366F1, #312E81)',
    'linear-gradient(135deg, #DB2777, #9D174D)',
  ]
  return { initials: initials.toUpperCase().slice(0, 2), gradient: PALETTES[Math.abs(h) % PALETTES.length] }
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

/**
 * Build the headline + sub-line for an activity row.
 * Returns React content so we can bold the attendee name etc.
 */
function describeActivity(row: ActivityRow) {
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
        return {
          headline: (
            <>
              <strong className="font-semibold text-foreground">{actor}</strong> scheduled a meeting with{' '}
              <strong className="font-semibold text-foreground">{attendeeName}</strong>
            </>
          ),
          sub: `${dateStr} at ${timeStr}`,
        }
      }
      return {
        headline: (
          <>
            <strong className="font-semibold text-foreground">{actor}</strong> flagged{' '}
            <strong className="font-semibold text-foreground">{attendeeName}</strong> as Want to Meet
          </>
        ),
        sub: null,
      }
    }
    case 'status_done':
      return {
        headline: (
          <>
            <strong className="font-semibold text-foreground">{actor}</strong> wrapped up the meeting with{' '}
            <strong className="font-semibold text-foreground">{attendeeName}</strong>
          </>
        ),
        sub: null,
      }
    case 'action_item_added':
      return {
        headline: (
          <>
            <strong className="font-semibold text-foreground">{actor}</strong> added an action item for{' '}
            <strong className="font-semibold text-foreground">{attendeeName}</strong>
          </>
        ),
        sub: null,
      }
    case 'action_item_completed':
      return {
        headline: (
          <>
            <strong className="font-semibold text-foreground">{actor}</strong> ticked off an action item for{' '}
            <strong className="font-semibold text-foreground">{attendeeName}</strong>
          </>
        ),
        sub: null,
      }
    default:
      return {
        headline: (
          <>
            <strong className="font-semibold text-foreground">{actor}</strong> updated a meeting
          </>
        ),
        sub: null,
      }
  }
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

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

  const rows = activities.map((row) => {
    const involvesMe = !!(userId && row.meeting_id && myMeetingIds.has(row.meeting_id) && row.actor_id !== userId)
    const isMine = !!(userId && row.actor_id === userId)
    const isUnread = !!(involvesMe && previousLastSeen && row.created_at > previousLastSeen)

    const href = row.meeting_id
      ? `/meetings/${row.meeting_id}`
      : row.attendee_id
      ? `/attendees/${row.attendee_id}`
      : null

    const { initials, gradient } = avatarFor(row.team_members?.display_name ?? null)
    const { headline, sub } = describeActivity(row)
    const hasTime = !!row.meetings?.scheduled_at

    const wrapperClasses = [
      'group block px-4 py-3 transition-colors relative',
      involvesMe ? 'bg-[var(--color-teal)]/5 hover:bg-[var(--color-teal)]/10' : 'hover:bg-muted/40',
      isUnread ? 'border-l-2 border-l-[var(--color-gold)]' : 'border-l-2 border-l-transparent',
    ].join(' ')

    const content = (
      <div className="flex items-start gap-3">
        {/* Actor avatar with action icon overlay */}
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="flex w-10 h-10 rounded-full items-center justify-center text-white text-xs font-semibold ring-1 ring-black/5"
            style={{ backgroundImage: gradient }}
          >
            {initials || '?'}
          </div>
          <div className="absolute -bottom-1 -right-1 ring-2 ring-background rounded-full">
            <ActivityIcon action={row.action} hasTime={hasTime} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground leading-snug">{headline}</p>
          {sub && (
            <p className="text-xs text-foreground/80 mt-0.5 tabular-nums">{sub}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <span>{relativeTime(row.created_at)}</span>
            {isUnread && (
              <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-full bg-[var(--color-gold)]/20 text-[var(--color-gold)]">
                NEW
              </span>
            )}
            {involvesMe && !isUnread && (
              <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 rounded-full bg-[var(--color-teal)]/10 text-[var(--color-teal)]">
                You&apos;re on
              </span>
            )}
          </p>
        </div>
        {href && (
          <span
            aria-hidden
            className="hidden sm:inline-flex items-center self-center text-muted-foreground/40 group-hover:text-[var(--color-teal)] transition-colors shrink-0 text-lg"
          >
            ›
          </span>
        )}
      </div>
    )

    return {
      id: row.id,
      involvesMe,
      isMine,
      node: href ? (
        <Link href={href} className={wrapperClasses}>{content}</Link>
      ) : (
        <div className={wrapperClasses}>{content}</div>
      ),
    }
  })

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
      <div className="px-4 py-5 flex items-center justify-between">
        <h1 className="editorial-h1 text-3xl text-foreground">Feed</h1>
        <p className="text-xs text-muted-foreground tabular-nums">{activities.length} recent</p>
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
        <FeedFilter
          rows={groups.flatMap((g) => [
            {
              id: `__day-${g.label}`,
              involvesMe: false,
              isMine: false,
              node: (
                <div className="px-4 py-1.5 bg-muted/30 border-y border-border/60">
                  <p className="editorial-eyebrow text-muted-foreground">{g.label}</p>
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
