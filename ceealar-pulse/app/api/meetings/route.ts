import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { MeetingStatus } from '@/lib/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    attendee_id: string
    owner_id?: string
    status?: MeetingStatus
    scheduled_at?: string | null
    duration_minutes?: number | null
    location?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { attendee_id, owner_id, status, scheduled_at, duration_minutes, location } = body

  if (!attendee_id) {
    return NextResponse.json({ error: 'attendee_id required' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: meeting, error } = await admin
    .from('meetings')
    .insert({
      attendee_id,
      owner_id: owner_id ?? user.id,
      status: status ?? 'want_to_meet',
      scheduled_at: scheduled_at ?? null,
      duration_minutes: duration_minutes ?? null,
      location: location ?? null,
    })
    .select()
    .single()

  if (error || !meeting) {
    console.error('meetings insert error:', error)
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Write activity row
  await admin.from('activity').insert({
    actor_id: user.id,
    meeting_id: meeting.id,
    attendee_id,
    action: 'meeting_created',
    detail: { status: meeting.status },
  })

  return NextResponse.json(meeting, { status: 201 })
}
