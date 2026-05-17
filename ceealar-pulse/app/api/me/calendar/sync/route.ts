import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncUserCalendar } from '@/lib/ical-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST — manually sync the current user's iCal feed
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: row } = await admin
    .from('user_ical_urls')
    .select('url')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row?.url) {
    return NextResponse.json({ error: 'No iCal URL configured' }, { status: 400 })
  }

  const result = await syncUserCalendar(user.id, row.url)
  return NextResponse.json(result)
}
