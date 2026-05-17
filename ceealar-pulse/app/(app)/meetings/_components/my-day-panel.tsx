import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fetchOtherEvents } from '@/lib/ical-sync'

interface Props {
  userId: string
}

/**
 * Reads the current user's iCal URL and shows non-"Meet" events as read-only context.
 * Silent failure: if the feed is unreachable or no URL configured, renders nothing.
 */
export async function MyDayPanel({ userId }: Props) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: row } = await admin
    .from('user_ical_urls')
    .select('url')
    .eq('user_id', userId)
    .maybeSingle()

  if (!row?.url) return null

  let events
  try {
    events = await fetchOtherEvents(row.url)
  } catch {
    return null
  }

  // Conference window only
  const start = new Date('2026-05-28T00:00:00+00:00').getTime()
  const end = new Date('2026-05-31T23:59:59+00:00').getTime()
  const inWindow = events.filter((e) => {
    const t = e.startAt.getTime()
    return t >= start && t <= end
  })

  if (inWindow.length === 0) return null

  // Group by day
  const byDay = new Map<string, typeof inWindow>()
  for (const evt of inWindow) {
    const key = evt.startAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    const arr = byDay.get(key) ?? []
    arr.push(evt)
    byDay.set(key, arr)
  }

  return (
    <details className="mb-4 border rounded-lg bg-card">
      <summary className="px-4 py-2.5 cursor-pointer select-none text-sm font-medium hover:bg-muted/50 rounded-lg">
        My Day — {inWindow.length} other event{inWindow.length === 1 ? '' : 's'} on your calendar
      </summary>
      <div className="px-4 pb-3 space-y-3 text-sm">
        {[...byDay.entries()].map(([day, dayEvents]) => (
          <div key={day}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{day}</p>
            <ul className="space-y-1">
              {dayEvents
                .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
                .map((e) => (
                  <li key={e.uid} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground font-mono text-xs shrink-0 pt-0.5">
                      {e.startAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                    <span className="min-w-0 truncate">{e.summary}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  )
}
