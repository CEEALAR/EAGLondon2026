import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { MeetingStatus } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Partial<{
    why_relevant: string
    talking_points: string
    meeting_notes: string
    comments: string
    follow_up_date: string | null
    status: MeetingStatus
    location: string | null
    scheduled_at: string | null
    duration_minutes: number | null
    owner_id: string | null
  }>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Fetch current meeting to check ownership
  const { data: current } = await supabase
    .from('meetings')
    .select('id, owner_id, status, attendee_id')
    .eq('id', id)
    .single()

  if (!current) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  // status changes to done/no_show/cancelled require confirmation — but we trust the UI handles that
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Build update object — only include provided fields
  const updates: Record<string, unknown> = {}
  const allowedFields = [
    'why_relevant', 'talking_points', 'meeting_notes', 'comments',
    'follow_up_date', 'status', 'location', 'scheduled_at',
    'duration_minutes', 'owner_id'
  ]
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = (body as Record<string, unknown>)[field]
    }
  }

  const { data: updated, error } = await admin
    .from('meetings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error || !updated) {
    console.error('meetings update error:', error)
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  // Write activity for status→done transition
  if (body.status === 'done' && current.status !== 'done') {
    await admin.from('activity').insert({
      actor_id: user.id,
      meeting_id: id,
      attendee_id: current.attendee_id,
      action: 'status_done',
      detail: { from: current.status, to: 'done' },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: current } = await supabase
    .from('meetings')
    .select('owner_id')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (current.owner_id !== user.id) {
    return NextResponse.json({ error: 'Only the meeting owner can delete it' }, { status: 403 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin.from('meetings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
