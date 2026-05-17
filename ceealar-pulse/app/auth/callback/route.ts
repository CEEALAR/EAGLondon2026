import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  const supabase = await createClient()

  // If a code is present, this is a fresh OAuth return — exchange it.
  // If no code, the user may already have a session (the signin page can
  // re-hit this route to run the post-auth routing logic).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/signin?error=auth_error`)
    }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/signin`)
  }

  if (!user.email?.endsWith('@ceealar.org')) {
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

  // First-time / no-calendar users land on /me so they can set up the iCal
  // sync. Returning users with a connected calendar go straight to /attendees.
  const { data: ical } = await adminClient
    .from('user_ical_urls')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const destination = ical ? '/attendees' : '/me?welcome=1'
  return NextResponse.redirect(`${origin}${destination}`)
}
