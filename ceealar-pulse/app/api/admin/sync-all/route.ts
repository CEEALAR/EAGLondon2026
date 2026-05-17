/**
 * Admin endpoint: force-sync every team member's iCal feed.
 * Returns a per-user result summary. Bypasses the per-user 5-min throttle.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncUserCalendar } from '@/lib/ical-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: rows } = await admin
    .from('user_ical_urls')
    .select('user_id, url, team_members!user_ical_urls_user_id_fkey(display_name, email)')

  const targets = ((rows ?? []) as unknown as Array<{
    user_id: string
    url: string | null
    team_members: { display_name: string | null; email: string } | null
  }>).filter((r) => !!r.url)

  const results: Array<{
    user_id: string
    name: string
    created: number
    promoted: number
    updated: number
    cancelled: number
    unmatched: number
    errors: string[]
  }> = []

  for (const t of targets) {
    const name = t.team_members?.display_name ?? t.team_members?.email ?? t.user_id
    try {
      const r = await syncUserCalendar(t.user_id, t.url!)
      results.push({
        user_id: t.user_id, name,
        created: r.created, promoted: r.promoted, updated: r.updated,
        cancelled: r.cancelled, unmatched: r.unmatched, errors: r.errors,
      })
    } catch (e) {
      results.push({
        user_id: t.user_id, name,
        created: 0, promoted: 0, updated: 0, cancelled: 0, unmatched: 0,
        errors: [e instanceof Error ? e.message : String(e)],
      })
    }
  }

  return NextResponse.json({ results, count: results.length })
}
