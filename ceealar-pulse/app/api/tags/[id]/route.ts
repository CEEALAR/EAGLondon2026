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
  const { name, color } = await req.json()

  const { data: tag } = await supabase
    .from('tags')
    .select('created_by, is_system')
    .eq('id', id)
    .single()

  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tag.is_system) return NextResponse.json({ error: 'System tags cannot be modified' }, { status: 403 })
  if (tag.created_by !== user.id) return NextResponse.json({ error: 'Not your tag' }, { status: 403 })

  const update: Record<string, string> = {}
  if (name?.trim()) update.name = name.trim()
  if (color) update.color = color

  const admin = adminClient()
  const { data, error } = await admin
    .from('tags')
    .update(update)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: tag } = await supabase
    .from('tags')
    .select('created_by, is_system')
    .eq('id', id)
    .single()

  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tag.is_system) return NextResponse.json({ error: 'System tags cannot be deleted' }, { status: 403 })
  if (tag.created_by !== user.id) return NextResponse.json({ error: 'Not your tag' }, { status: 403 })

  const { count } = await supabase
    .from('attendee_tags')
    .select('*', { count: 'exact', head: true })
    .eq('tag_id', id)

  if (count && count > 0) {
    return NextResponse.json({ error: 'Tag is in use — remove all assignments first' }, { status: 409 })
  }

  const admin = adminClient()
  await admin.from('tags').delete().eq('id', id)
  return new NextResponse(null, { status: 204 })
}
