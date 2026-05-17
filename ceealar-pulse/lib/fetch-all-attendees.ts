/**
 * Fetch every attendee row by paginating in 1000-row batches.
 *
 * Supabase / PostgREST caps a single response at `max_rows` (default 1000)
 * regardless of `.range()` — so requesting 10000 rows still gives back 1000.
 * This helper loops until we've drained the table.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const PAGE = 1000

export async function fetchAllAttendees<T = unknown>(
  client: SupabaseClient,
  select: string,
): Promise<T[]> {
  const out: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await client
      .from('attendees')
      .select(select)
      .order('last_name', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const batch = (data ?? []) as T[]
    out.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return out
}
