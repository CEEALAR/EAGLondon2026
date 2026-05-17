/**
 * iCal sync engine — Phase 9.
 *
 * Fetches a user's Swapcard iCal URL, parses VEVENT entries, matches "Meet *"
 * events to attendees by first name, and applies changes to the meetings table.
 *
 * Calendar wins on time/location/duration. Pulse owns status, notes, members.
 */

import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'

export type ParsedEvent = {
  uid: string
  summary: string
  startAt: Date
  endAt: Date | null
  location: string | null
  candidateName: string | null  // null = not a "Meet *" event
}

export type SyncResult = {
  fetched: number          // total VEVENTs in feed
  meetEvents: number       // events starting with "Meet "
  otherEvents: number      // non-Meet events
  created: number          // new Pulse meetings created
  promoted: number         // existing want_to_meet promoted to planned
  updated: number          // existing iCal meetings refreshed
  cancelled: number        // meetings cancelled because event vanished
  unmatched: number        // landed in unmatched tray
  errors: string[]
}

const MEET_PREFIX_RE = /^meet\s+/i

/**
 * Parse the iCal feed string into a structured list.
 * Filters out non-VEVENT entries.
 * Dynamic import keeps node-ical (and its rrule/BigInt deps) out of Next.js
 * build-time page-data collection.
 */
export async function parseICalText(text: string): Promise<ParsedEvent[]> {
  const ical = await import('node-ical')
  const data = ical.parseICS(text)
  const events: ParsedEvent[] = []

  for (const key of Object.keys(data)) {
    const entry = data[key]
    if (!entry || entry.type !== 'VEVENT') continue
    const summary = String(entry.summary ?? '').trim()
    if (!entry.start || !summary) continue

    const candidateName = MEET_PREFIX_RE.test(summary)
      ? summary.replace(MEET_PREFIX_RE, '').trim() || null
      : null

    events.push({
      uid: String(entry.uid ?? key),
      summary,
      startAt: new Date(entry.start as Date),
      endAt: entry.end ? new Date(entry.end as Date) : null,
      location: entry.location ? String(entry.location) : null,
      candidateName,
    })
  }

  return events
}

/**
 * Fetch the iCal URL with a sane timeout.
 */
export async function fetchICalText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CEEALAR-Pulse/1.0 (iCal sync)' },
    })
    if (!res.ok) {
      throw new Error(`iCal fetch failed: ${res.status} ${res.statusText}`)
    }
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

function admin(): SupabaseClient {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function durationMinutes(start: Date, end: Date | null): number | null {
  if (!end) return null
  const ms = end.getTime() - start.getTime()
  return Math.max(1, Math.round(ms / 60_000))
}

/**
 * Match a candidate first name to attendees in the DB.
 * Returns 0, 1, or many attendee ids.
 */
async function matchAttendees(client: SupabaseClient, candidate: string): Promise<string[]> {
  const trimmed = candidate.trim()
  if (!trimmed) return []

  // Case-insensitive match on first_name. Use ilike to allow exact match with
  // varying casing without pulling all attendees.
  const { data, error } = await client
    .from('attendees')
    .select('id')
    .ilike('first_name', trimmed)
    .limit(5)

  if (error) throw error
  return (data ?? []).map((r: { id: string }) => r.id)
}

/**
 * Run a full sync for one user.
 */
export async function syncUserCalendar(userId: string, url: string): Promise<SyncResult> {
  const client = admin()
  const result: SyncResult = {
    fetched: 0,
    meetEvents: 0,
    otherEvents: 0,
    created: 0,
    promoted: 0,
    updated: 0,
    cancelled: 0,
    unmatched: 0,
    errors: [],
  }

  let events: ParsedEvent[]
  try {
    const text = await fetchICalText(url)
    events = await parseICalText(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    result.errors.push(msg)
    await client
      .from('user_ical_urls')
      .update({ last_sync_error: msg })
      .eq('user_id', userId)
    return result
  }

  result.fetched = events.length
  const meetEvents = events.filter((e) => e.candidateName !== null)
  result.meetEvents = meetEvents.length
  result.otherEvents = events.length - meetEvents.length

  // Set of UIDs present in current feed — used to detect cancellations
  const liveUids = new Set(meetEvents.map((e) => e.uid))

  // Existing iCal-sourced meetings owned by this user
  const { data: existingMeetings } = await client
    .from('meetings')
    .select('id, ical_uid, attendee_id, status, scheduled_at')
    .eq('owner_id', userId)
    .eq('source', 'ical')

  const existingByUid = new Map<string, { id: string; status: string; scheduled_at: string | null; attendee_id: string }>()
  for (const m of (existingMeetings ?? []) as Array<{ id: string; ical_uid: string | null; status: string; scheduled_at: string | null; attendee_id: string }>) {
    if (m.ical_uid) existingByUid.set(m.ical_uid, { id: m.id, status: m.status, scheduled_at: m.scheduled_at, attendee_id: m.attendee_id })
  }

  for (const evt of meetEvents) {
    if (!evt.candidateName) continue
    const dur = durationMinutes(evt.startAt, evt.endAt)

    const existing = existingByUid.get(evt.uid)
    if (existing) {
      // Update calendar-owned fields; preserve status, notes, etc.
      const { error } = await client
        .from('meetings')
        .update({
          scheduled_at: evt.startAt.toISOString(),
          duration_minutes: dur,
          location: evt.location,
          // If a previously-cancelled iCal meeting reappears, reactivate as planned
          status: existing.status === 'cancelled' ? 'planned' : existing.status,
        })
        .eq('id', existing.id)
      if (error) result.errors.push(`update ${evt.uid}: ${error.message}`)
      else result.updated++
      continue
    }

    // Try to match the candidate name to an attendee
    let matches: string[] = []
    try {
      matches = await matchAttendees(client, evt.candidateName)
    } catch (e) {
      result.errors.push(`match ${evt.uid}: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }

    if (matches.length === 1) {
      const attendeeId = matches[0]

      // Look for an existing want_to_meet for this user+attendee with no iCal binding
      const { data: existingWantToMeet } = await client
        .from('meetings')
        .select('id')
        .eq('owner_id', userId)
        .eq('attendee_id', attendeeId)
        .eq('status', 'want_to_meet')
        .is('ical_uid', null)
        .limit(1)
        .maybeSingle()

      if (existingWantToMeet) {
        // Promote existing want_to_meet to planned with iCal data
        const { error } = await client
          .from('meetings')
          .update({
            status: 'planned',
            scheduled_at: evt.startAt.toISOString(),
            duration_minutes: dur,
            location: evt.location,
            ical_uid: evt.uid,
            source: 'ical',
          })
          .eq('id', existingWantToMeet.id)
        if (error) result.errors.push(`promote ${evt.uid}: ${error.message}`)
        else result.promoted++
      } else {
        // Create a fresh planned meeting
        const { data: newMeeting, error } = await client
          .from('meetings')
          .insert({
            attendee_id: attendeeId,
            owner_id: userId,
            status: 'planned',
            scheduled_at: evt.startAt.toISOString(),
            duration_minutes: dur,
            location: evt.location,
            ical_uid: evt.uid,
            source: 'ical',
          })
          .select('id')
          .single()
        if (error || !newMeeting) {
          result.errors.push(`create ${evt.uid}: ${error?.message ?? 'unknown'}`)
        } else {
          // Add owner to meeting_members (matches manual creation behavior)
          await client
            .from('meeting_members')
            .upsert({ meeting_id: newMeeting.id, user_id: userId, added_by: userId }, { onConflict: 'meeting_id,user_id', ignoreDuplicates: true })
          // Activity row
          await client.from('activity').insert({
            actor_id: userId,
            meeting_id: newMeeting.id,
            attendee_id: attendeeId,
            action: 'meeting_created',
            detail: { status: 'planned', source: 'ical' },
          })
          result.created++
        }
      }
    } else {
      // 0 or >1 matches → unmatched tray (upsert by user_id + ical_uid)
      const { error } = await client
        .from('unmatched_ical_events')
        .upsert({
          user_id: userId,
          ical_uid: evt.uid,
          summary: evt.summary,
          candidate_name: evt.candidateName,
          start_at: evt.startAt.toISOString(),
          end_at: evt.endAt?.toISOString() ?? null,
          location: evt.location,
        }, { onConflict: 'user_id,ical_uid' })
      if (error) result.errors.push(`unmatched ${evt.uid}: ${error.message}`)
      else result.unmatched++
    }
  }

  // Cancel any iCal-sourced meetings whose event vanished from the feed
  for (const [uid, existing] of existingByUid.entries()) {
    if (liveUids.has(uid)) continue
    if (existing.status === 'cancelled') continue
    const { error } = await client
      .from('meetings')
      .update({ status: 'cancelled' })
      .eq('id', existing.id)
    if (error) result.errors.push(`cancel ${uid}: ${error.message}`)
    else result.cancelled++
  }

  // Update sync metadata
  await client
    .from('user_ical_urls')
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_error: result.errors.length > 0 ? result.errors.join('; ') : null,
    })
    .eq('user_id', userId)

  return result
}

/**
 * Public: list non-Meet events for the "My Day" panel.
 * Returns a lightweight preview without writing anything.
 */
export async function fetchOtherEvents(url: string): Promise<ParsedEvent[]> {
  const text = await fetchICalText(url)
  const events = await parseICalText(text)
  return events.filter((e) => e.candidateName === null)
}
