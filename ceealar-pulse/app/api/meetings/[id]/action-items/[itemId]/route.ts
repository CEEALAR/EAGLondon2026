import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: meetingId, itemId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { done?: boolean; text?: string; due_date?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Fetch item to check it belongs to this meeting
  const { data: existing } = await supabase
    .from('action_items')
    .select('id, meeting_id, done')
    .eq('id', itemId)
    .eq('meeting_id', meetingId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
  }

  // Fetch meeting for activity logging
  const { data: meeting } = await supabase
    .from('meetings')
    .select('attendee_id')
    .eq('id', meetingId)
    .single()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const updates: Record<string, unknown> = {}
  if ('done' in body) {
    updates.done = body.done
    if (body.done) {
      updates.done_at = new Date().toISOString()
    } else {
      updates.done_at = null
    }
  }
  if ('text' in body && body.text?.trim()) {
    updates.text = body.text.trim()
  }
  if ('due_date' in body) {
    updates.due_date = body.due_date
  }

  const { data: updated, error } = await admin
    .from('action_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single()

  if (error || !updated) {
    console.error('action_items update error:', error)
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  // Write activity for completion
  if (body.done === true && !existing.done) {
    await admin.from('activity').insert({
      actor_id: user.id,
      meeting_id: meetingId,
      attendee_id: meeting?.attendee_id ?? null,
      action: 'action_item_completed',
      detail: { item_id: itemId },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: meetingId, itemId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await admin
    .from('action_items')
    .delete()
    .eq('id', itemId)
    .eq('meeting_id', meetingId)

  if (error) {
    console.error('action_items delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
