import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const admin = () =>
  createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// PATCH — resolve (assign attendee) or dismiss an unmatched event
//   body: { action: 'resolve', attendee_id: string } or { action: 'dismiss' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const action: 'resolve' | 'dismiss' = body.action

  const a = admin()
  const { data: unmatched } = await a
    .from('unmatched_ical_events')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!unmatched) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (action === 'dismiss') {
    await a
      .from('unmatched_ical_events')
      .update({ dismissed: true })
      .eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (action === 'resolve') {
    const attendeeId: string | undefined = body.attendee_id
    if (!attendeeId) return NextResponse.json({ error: 'attendee_id required' }, { status: 400 })

    const durationMs = unmatched.end_at
      ? new Date(unmatched.end_at).getTime() - new Date(unmatched.start_at).getTime()
      : null
    const durationMinutes = durationMs ? Math.max(1, Math.round(durationMs / 60_000)) : null

    // Check for an existing want_to_meet to promote
    const { data: existingWant } = await a
      .from('meetings')
      .select('id')
      .eq('owner_id', user.id)
      .eq('attendee_id', attendeeId)
      .eq('status', 'want_to_meet')
      .is('ical_uid', null)
      .limit(1)
      .maybeSingle()

    let meetingId: string

    if (existingWant) {
      await a
        .from('meetings')
        .update({
          status: 'planned',
          scheduled_at: unmatched.start_at,
          duration_minutes: durationMinutes,
          location: unmatched.location,
          ical_uid: unmatched.ical_uid,
          source: 'ical',
        })
        .eq('id', existingWant.id)
      meetingId = existingWant.id
    } else {
      const { data: newMeeting, error } = await a
        .from('meetings')
        .insert({
          attendee_id: attendeeId,
          owner_id: user.id,
          status: 'planned',
          scheduled_at: unmatched.start_at,
          duration_minutes: durationMinutes,
          location: unmatched.location,
          ical_uid: unmatched.ical_uid,
          source: 'ical',
        })
        .select('id')
        .single()

      if (error || !newMeeting) {
        return NextResponse.json({ error: error?.message ?? 'create failed' }, { status: 500 })
      }
      meetingId = newMeeting.id

      await a
        .from('meeting_members')
        .upsert({ meeting_id: meetingId, user_id: user.id, added_by: user.id }, { onConflict: 'meeting_id,user_id', ignoreDuplicates: true })

      await a.from('activity').insert({
        actor_id: user.id,
        meeting_id: meetingId,
        attendee_id: attendeeId,
        action: 'meeting_created',
        detail: { status: 'planned', source: 'ical', resolved_from_unmatched: true },
      })
    }

    // Mark unmatched as resolved
    await a
      .from('unmatched_ical_events')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ ok: true, meeting_id: meetingId })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
