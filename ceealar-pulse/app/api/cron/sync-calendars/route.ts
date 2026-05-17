import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncUserCalendar } from '@/lib/ical-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Vercel cron endpoint — runs every 5 minutes during conference window.
 * Configured in vercel.json. Authenticated via either:
 *   1. Vercel's automatic `Authorization: Bearer ${CRON_SECRET}` header
 *   2. The `x-vercel-cron` header that Vercel injects for cron requests
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'

  if (!isVercelCron && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: urls } = await admin
    .from('user_ical_urls')
    .select('user_id, url')

  if (!urls || urls.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, results: [] })
  }

  const results = []
  for (const row of urls as Array<{ user_id: string; url: string }>) {
    try {
      const result = await syncUserCalendar(row.user_id, row.url)
      results.push({ user_id: row.user_id, ...result })
    } catch (e) {
      results.push({
        user_id: row.user_id,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({ ok: true, synced: results.length, results })
}
