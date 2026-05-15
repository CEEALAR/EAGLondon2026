import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const adminClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: attendeeId } = await params
  const { tag_id } = await req.json()
  if (!tag_id) return NextResponse.json({ error: 'tag_id required' }, { status: 400 })

  const admin = adminClient()
  const { error } = await admin
    .from('attendee_tags')
    .insert({ attendee_id: attendeeId, tag_id, created_by: user.id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already assigned' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({}, { status: 201 })
}
