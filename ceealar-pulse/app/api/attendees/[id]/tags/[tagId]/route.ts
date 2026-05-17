import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const adminClient = () =>
  createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: attendeeId, tagId } = await params

  const admin = adminClient()
  const { error } = await admin
    .from('attendee_tags')
    .delete()
    .eq('attendee_id', attendeeId)
    .eq('tag_id', tagId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('activity').insert({
    actor_id: user.id,
    attendee_id: attendeeId,
    action: 'tag_removed',
    detail: { tag_id: tagId },
  })

  return new NextResponse(null, { status: 204 })
}
