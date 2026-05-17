import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const ICAL_URL_RE = /^https:\/\/calendar\.google\.com\/calendar\/ical\/.+\.ics(\?.*)?$/

function admin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// GET — return the current user's stored iCal URL + sync status
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await admin()
    .from('user_ical_urls')
    .select('url, last_synced_at, last_sync_error, created_at')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ calendar: data ?? null })
}

// POST — save (insert or update) the user's iCal URL
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const url: string | undefined = body.url?.trim()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  if (!ICAL_URL_RE.test(url)) {
    return NextResponse.json({
      error: 'URL must look like https://calendar.google.com/calendar/ical/…/basic.ics',
    }, { status: 400 })
  }

  const { error } = await admin()
    .from('user_ical_urls')
    .upsert({ user_id: user.id, url, last_sync_error: null })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — disconnect the iCal feed
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await admin().from('user_ical_urls').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
