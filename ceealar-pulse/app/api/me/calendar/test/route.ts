import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchICalText, parseICalText } from '@/lib/ical-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const ICAL_URL_RE = /^https:\/\/calendar\.google\.com\/calendar\/ical\/.+\.ics(\?.*)?$/

// POST — validate a URL by fetching it and returning a preview (no DB writes)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (typeof url !== 'string' || !ICAL_URL_RE.test(url.trim())) {
    return NextResponse.json({ error: 'Invalid iCal URL format' }, { status: 400 })
  }

  try {
    const text = await fetchICalText(url.trim())
    const events = parseICalText(text)
    const meetEvents = events.filter((e) => e.candidateName !== null)
    const preview = meetEvents.slice(0, 5).map((e) => ({
      summary: e.summary,
      candidateName: e.candidateName,
      startAt: e.startAt.toISOString(),
    }))
    return NextResponse.json({
      ok: true,
      totalEvents: events.length,
      meetEvents: meetEvents.length,
      preview,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'fetch failed' },
      { status: 502 }
    )
  }
}
