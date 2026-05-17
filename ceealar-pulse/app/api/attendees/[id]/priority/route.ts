import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const adminClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const raw = body.priority

  let priority: number | null
  if (raw === null) {
    priority = null
  } else if (typeof raw === 'number' && raw >= 1 && raw <= 5 && Number.isInteger(raw)) {
    priority = raw
  } else {
    return NextResponse.json({ error: 'priority must be 1-5 or null' }, { status: 400 })
  }

  const admin = adminClient()

  // Read previous value so the audit row captures the diff
  const { data: prev } = await admin
    .from('attendees')
    .select('priority')
    .eq('id', id)
    .maybeSingle()
  if (!prev) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin.from('attendees').update({ priority }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Append-only audit trail — recovery from a compromised session needs this.
  if ((prev.priority ?? null) !== priority) {
    await admin.from('activity').insert({
      actor_id: user.id,
      attendee_id: id,
      action: 'priority_changed',
      detail: { from: prev.priority ?? null, to: priority },
    })
  }

  return NextResponse.json({ priority })
}
