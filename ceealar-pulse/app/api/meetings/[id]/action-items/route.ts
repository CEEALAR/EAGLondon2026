import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: meetingId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { text: string; due_date?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  // Verify meeting exists and user is authenticated (already checked above)
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, attendee_id')
    .eq('id', meetingId)
    .single()

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: item, error } = await admin
    .from('action_items')
    .insert({
      meeting_id: meetingId,
      created_by: user.id,
      text: body.text.trim(),
      due_date: body.due_date ?? null,
    })
    .select()
    .single()

  if (error || !item) {
    console.error('action_items insert error:', error)
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Write activity
  await admin.from('activity').insert({
    actor_id: user.id,
    meeting_id: meetingId,
    attendee_id: meeting.attendee_id,
    action: 'action_item_added',
    detail: { text: item.text },
  })

  return NextResponse.json(item, { status: 201 })
}
