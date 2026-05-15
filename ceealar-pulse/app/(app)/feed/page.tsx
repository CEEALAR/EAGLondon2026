import { createClient } from '@/lib/supabase/server'

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

type DayGroup = { label: string; activities: ActivityRow[] }

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
        const timeStr = d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
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

  const { data: activityRaw } = await supabase
    .from('activity')
    .select(
      'id, action, created_at, actor_id, meeting_id, attendee_id, detail, team_members(display_name), attendees(first_name, last_name), meetings(scheduled_at)'
    )
    .order('created_at', { ascending: false })
    .limit(100)

  const activities = (activityRaw ?? []) as unknown as ActivityRow[]

  const groups: DayGroup[] = []
  for (const row of activities) {
    const label = dayLabel(row.created_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.activities.push(row)
    } else {
      groups.push({ label, activities: [row] })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-4 py-4">
        <h1 className="text-xl font-semibold text-foreground">Feed</h1>
      </div>

      {groups.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No activity yet — create a meeting or mark one as done to see it here.
          </p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-4 py-1.5 bg-muted/50 border-y border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {group.label}
            </p>
          </div>
          {group.activities.map((row) => (
            <div
              key={row.id}
              className="px-4 py-3 border-b border-border"
            >
              <p className="text-sm text-foreground">{formatActivity(row)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(row.created_at)}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
