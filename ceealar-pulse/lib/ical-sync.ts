/**
 * iCal sync engine — Phase 9.
 *
 * Fetches a user's Swapcard iCal URL, parses VEVENT entries, matches "Meet *"
 * events to attendees by first name, and applies changes to the meetings table.
 *
 * Calendar wins on time/location/duration. Pulse owns status, notes, members.
 *
 * Uses a custom zero-dependency parser (lib/ical-parser.ts) — node-ical/rrule
 * had BigInt-bundling issues with Next.js webpack and dragged in temporal-polyfill
 * which Vercel's serverless bundler couldn't resolve.
 */

import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'
import { parseICal, type ParsedEvent } from './ical-parser'

export type { ParsedEvent }

export type SyncResult = {
  fetched: number
  meetEvents: number
  otherEvents: number
  inWindow: number          // meet events inside conference window
  created: number
  promoted: number
  updated: number
  cancelled: number
  unmatched: number
  errors: string[]
}

// EAG London 2026 conference window. Events outside this are ignored to avoid
// importing 1:1s from other conferences the user has attended (the Swapcard
// Google Calendar aggregates all events).
const WINDOW_START = Date.UTC(2026, 4, 28, 0, 0, 0)  // 28 May 2026 00:00 UTC
const WINDOW_END   = Date.UTC(2026, 5, 1, 0, 0, 0)   // 1 Jun 2026 00:00 UTC

const ALLOWED_ICAL_HOSTS = new Set(['calendar.google.com'])
const MAX_ICAL_BYTES = 5_000_000 // 5MB — Google calendars top out far below this

/**
 * Fetch an iCal feed with SSRF defences:
 *   - parse the URL (not just regex it) so userinfo/`@` tricks can't spoof host
 *   - require https + allow-listed hostname
 *   - refuse to follow redirects (an open redirect on the host would otherwise
 *     pivot us to private/metadata endpoints)
 *   - cap response size
 */
export async function fetchICalText(url: string): Promise<string> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('iCal URL is not a valid URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('iCal URL must use https://')
  }
  if (!ALLOWED_ICAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`iCal host not allowed: ${parsed.hostname}`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'CEEALAR-Pulse/1.0 (iCal sync)' },
      redirect: 'manual',
    })
    if (res.status >= 300 && res.status < 400) {
      throw new Error('iCal fetch returned a redirect — refusing to follow')
    }
    if (!res.ok) {
      throw new Error(`iCal fetch failed: HTTP ${res.status} ${res.statusText}`)
    }
    const text = await res.text()
    if (text.length > MAX_ICAL_BYTES) {
      throw new Error(`iCal response too large (${text.length} bytes)`)
    }
    return text
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('iCal fetch timed out after 10 seconds — Google may be slow or the URL is wrong')
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

export function parseICalText(text: string): ParsedEvent[] {
  return parseICal(text)
}

function inWindow(d: Date): boolean {
  const t = d.getTime()
  return t >= WINDOW_START && t < WINDOW_END
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
 * Match a candidate name to attendees.
 * Tries (in order):
 *   1. Full candidate string against first_name (handles "Sasha")
 *   2. First word against first_name (handles "Steve Thompson")
 *   3. First word against first_name AND last word against last_name (most precise)
 * Returns the most specific set of matching attendee ids it finds.
 */
async function matchAttendees(client: SupabaseClient, candidate: string): Promise<string[]> {
  const trimmed = candidate.trim()
  if (!trimmed) return []
  const tokens = trimmed.split(/\s+/)
  const firstToken = tokens[0]
  const lastToken = tokens.length > 1 ? tokens[tokens.length - 1] : null

  // Most specific: first AND last token — narrows multi-Sasha case quickly.
  if (lastToken) {
    const { data } = await client
      .from('attendees')
      .select('id')
      .ilike('first_name', firstToken)
      .ilike('last_name', lastToken)
      .limit(5)
    const ids = (data ?? []).map((r: { id: string }) => r.id)
    if (ids.length > 0) return ids
  }

  // Fall back to first-token match
  const { data, error } = await client
    .from('attendees')
    .select('id')
    .ilike('first_name', firstToken)
    .limit(5)
  if (error) throw error
  return (data ?? []).map((r: { id: string }) => r.id)
}

export async function syncUserCalendar(userId: string, url: string): Promise<SyncResult> {
  const client = admin()
  const result: SyncResult = {
    fetched: 0, meetEvents: 0, otherEvents: 0, inWindow: 0,
    created: 0, promoted: 0, updated: 0, cancelled: 0, unmatched: 0, errors: [],
  }

  let events: ParsedEvent[]
  try {
    const text = await fetchICalText(url)
    events = parseICalText(text)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    result.errors.push(msg)
    await client.from('user_ical_urls').update({ last_sync_error: msg }).eq('user_id', userId)
    return result
  }

  result.fetched = events.length
  const meetEvents = events.filter((e) => e.candidateName !== null)
  result.meetEvents = meetEvents.length
  result.otherEvents = events.length - meetEvents.length
  const meetInWindow = meetEvents.filter((e) => inWindow(e.startAt))
  result.inWindow = meetInWindow.length

  const liveUids = new Set(meetInWindow.map((e) => e.uid))

  const { data: existingMeetings } = await client
    .from('meetings')
    .select('id, ical_uid, attendee_id, status, scheduled_at')
    .eq('owner_id', userId)
    .eq('source', 'ical')

  const existingByUid = new Map<string, { id: string; status: string; scheduled_at: string | null; attendee_id: string }>()
  for (const m of (existingMeetings ?? []) as Array<{ id: string; ical_uid: string | null; status: string; scheduled_at: string | null; attendee_id: string }>) {
    if (m.ical_uid) existingByUid.set(m.ical_uid, { id: m.id, status: m.status, scheduled_at: m.scheduled_at, attendee_id: m.attendee_id })
  }

  for (const evt of meetInWindow) {
    if (!evt.candidateName) continue
    const dur = durationMinutes(evt.startAt, evt.endAt)

    const existing = existingByUid.get(evt.uid)
    if (existing) {
      const { error } = await client
        .from('meetings')
        .update({
          scheduled_at: evt.startAt.toISOString(),
          duration_minutes: dur,
          location: evt.location,
          status: existing.status === 'cancelled' ? 'planned' : existing.status,
        })
        .eq('id', existing.id)
      if (error) result.errors.push(`update ${evt.uid}: ${error.message}`)
      else result.updated++
      continue
    }

    let matches: string[] = []
    try {
      matches = await matchAttendees(client, evt.candidateName)
    } catch (e) {
      result.errors.push(`match ${evt.uid}: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }

    if (matches.length === 1) {
      const attendeeId = matches[0]
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
          await client
            .from('meeting_members')
            .upsert({ meeting_id: newMeeting.id, user_id: userId, added_by: userId }, { onConflict: 'meeting_id,user_id', ignoreDuplicates: true })
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

  for (const [uid, existing] of existingByUid.entries()) {
    if (liveUids.has(uid)) continue
    if (existing.status === 'cancelled') continue
    const { error } = await client.from('meetings').update({ status: 'cancelled' }).eq('id', existing.id)
    if (error) result.errors.push(`cancel ${uid}: ${error.message}`)
    else result.cancelled++
  }

  await client
    .from('user_ical_urls')
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_error: result.errors.length > 0 ? result.errors.join('; ') : null,
    })
    .eq('user_id', userId)

  return result
}

export async function fetchOtherEvents(url: string): Promise<ParsedEvent[]> {
  const text = await fetchICalText(url)
  const events = parseICalText(text)
  return events.filter((e) => e.candidateName === null && inWindow(e.startAt))
}
