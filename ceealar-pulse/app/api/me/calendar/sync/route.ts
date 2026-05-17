import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncUserCalendar } from '@/lib/ical-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const THROTTLE_MS = 5 * 60 * 1000 // 5 min

// POST — sync the current user's iCal feed.
//   ?force=1 bypasses the 5-minute throttle (used by the manual "Sync now" button).
//   Without it, calls within 5 min of the last sync return a "throttled" no-op.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const force = req.nextUrl.searchParams.get('force') === '1'

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: row } = await admin
    .from('user_ical_urls')
    .select('url, last_synced_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row?.url) {
    return NextResponse.json({ error: 'No iCal URL configured' }, { status: 400 })
  }

  if (!force && row.last_synced_at) {
    const age = Date.now() - new Date(row.last_synced_at).getTime()
    if (age < THROTTLE_MS) {
      return NextResponse.json({
        throttled: true,
        last_synced_at: row.last_synced_at,
        age_seconds: Math.round(age / 1000),
      })
    }
  }

  const result = await syncUserCalendar(user.id, row.url)
  return NextResponse.json(result)
}
