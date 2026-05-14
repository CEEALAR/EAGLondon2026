import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/signin`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=auth_error`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email?.endsWith('@ceealar.org')) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/signin?error=unauthorized`)
  }

  // Upsert team_member using service role (bypasses RLS insert restriction)
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  await adminClient.from('team_members').upsert(
    {
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: 'id' }
  )

  return NextResponse.redirect(`${origin}/attendees`)
}
