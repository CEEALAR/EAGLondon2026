import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminBase } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_DOMAIN = 'ceealar.org'

/** Strict, case-insensitive match on the email's domain part. */
function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const lower = email.toLowerCase().trim()
  const at = lower.lastIndexOf('@')
  if (at < 0) return false
  return lower.slice(at + 1) === ALLOWED_DOMAIN
}

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

  if (!isAllowedEmail(user.email)) {
    // Sign out the session and delete the auth.users row so we don't
    // accumulate junk identities. The `hd` query param to Google is only
    // a consent-screen hint — this is the real enforcement boundary.
    await supabase.auth.signOut()
    try {
      const purge = createAdminBase(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )
      await purge.auth.admin.deleteUser(user.id)
    } catch {
      // best-effort; failure here doesn't change the auth outcome
    }
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
