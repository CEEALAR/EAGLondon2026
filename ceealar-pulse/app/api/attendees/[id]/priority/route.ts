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
  const { error } = await admin.from('attendees').update({ priority }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ priority })
}
