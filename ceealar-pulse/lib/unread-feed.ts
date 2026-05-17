/**
 * Compute how many activity rows the current user hasn't seen yet AND
 * are about meetings they're a member of (excluding actions they triggered
 * themselves). Used for the Feed tab notification badge.
 */

import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'

function admin(): SupabaseClient {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getUnreadFeedCount(userId: string): Promise<number> {
  try {
    const client = admin()

    // 1. When did the user last visit /feed?
    const { data: tm } = await client
      .from('team_members')
      .select('feed_last_seen_at')
      .eq('id', userId)
      .maybeSingle()

    const sinceIso = (tm?.feed_last_seen_at as string | null) ?? new Date(0).toISOString()

    // 2. Find which meetings the user is a member of.
    const { data: memberRows } = await client
      .from('meeting_members')
      .select('meeting_id')
      .eq('user_id', userId)

    const myMeetingIds = (memberRows ?? []).map((r: { meeting_id: string }) => r.meeting_id)
    if (myMeetingIds.length === 0) return 0

    // 3. Count activities on those meetings since last seen, excluding the
    //    user's own actions. Cap at 99 for the badge (no need to be exact).
    const { count } = await client
      .from('activity')
      .select('*', { count: 'exact', head: true })
      .in('meeting_id', myMeetingIds)
      .neq('actor_id', userId)
      .gt('created_at', sinceIso)

    return Math.min(99, count ?? 0)
  } catch {
    return 0
  }
}
