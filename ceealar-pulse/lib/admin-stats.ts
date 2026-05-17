/**
 * Admin dashboard server helpers.
 *
 * One pass over meetings/attendees/team_members/user_ical_urls to compute
 * the operational stats, coverage breakdowns, sync health, gaps list, and
 * want-to-meet aging shown on /admin.
 */

import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'

export const CONFERENCE_DAYS = [
  { iso: '2026-05-29', label: 'Fri 29' },
  { iso: '2026-05-30', label: 'Sat 30' },
  { iso: '2026-05-31', label: 'Sun 31' },
] as const

export type PerPersonLoad = {
  user_id: string
  display_name: string
  byDay: number[]   // counts aligned to CONFERENCE_DAYS
  unscheduled: number
  total: number
}

export type PriorityCoverage = {
  priority: number   // 5..1
  total: number
  covered: number    // unique attendees with any active meeting (want_to_meet/planned/done)
}

export type CategoryCoverage = {
  category: string
  total: number
  covered: number
}

export type SyncHealth = {
  user_id: string
  display_name: string
  has_url: boolean
  last_synced_at: string | null
  last_sync_error: string | null
}

export type WantToMeetAging = {
  meeting_id: string
  attendee_id: string
  attendee_name: string
  owner_name: string
  created_at: string
  days_old: number
  priority: number | null
}

export type GapAttendee = {
  id: string
  first_name: string | null
  last_name: string | null
  company: string | null
  priority: number
  priority_category: string | null
}

export type AdminOpStats = {
  perPerson: PerPersonLoad[]
  priorityCoverage: PriorityCoverage[]
  categoryCoverage: CategoryCoverage[]
  syncHealth: SyncHealth[]
  wantToMeetAging: WantToMeetAging[]
  gapsList: GapAttendee[]
}

function admin(): SupabaseClient {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isoDay(scheduled_at: string | null): string | null {
  if (!scheduled_at) return null
  // Use local-ish date stamp by slicing YYYY-MM-DD from the ISO. Scheduled times
  // are stored with timezone; events are in BST so the UTC day usually matches.
  // For 09:00 BST start on May 29, the ISO is 2026-05-29T08:00:00Z → same date.
  return scheduled_at.slice(0, 10)
}

export async function getAdminOpStats(): Promise<AdminOpStats> {
  const client = admin()

  const [
    { data: members },
    { data: meetings },
    { data: attendees },
    { data: icalRows },
  ] = await Promise.all([
    client.from('team_members').select('id, display_name, email').order('display_name'),
    client.from('meetings').select('id, owner_id, attendee_id, status, scheduled_at, created_at'),
    client.from('attendees').select('id, first_name, last_name, company, priority, priority_category'),
    client.from('user_ical_urls').select('user_id, url, last_synced_at, last_sync_error'),
  ])

  const memberRows = (members ?? []) as Array<{ id: string; display_name: string | null; email: string }>
  const meetingRows = (meetings ?? []) as Array<{
    id: string; owner_id: string | null; attendee_id: string; status: string;
    scheduled_at: string | null; created_at: string;
  }>
  const attendeeRows = (attendees ?? []) as Array<{
    id: string; first_name: string | null; last_name: string | null; company: string | null;
    priority: number | null; priority_category: string | null;
  }>
  const icalMap = new Map<string, { url: string | null; last_synced_at: string | null; last_sync_error: string | null }>()
  for (const r of (icalRows ?? []) as Array<{ user_id: string; url: string | null; last_synced_at: string | null; last_sync_error: string | null }>) {
    icalMap.set(r.user_id, { url: r.url, last_synced_at: r.last_synced_at, last_sync_error: r.last_sync_error })
  }

  const nameFor = (uid: string | null) => {
    if (!uid) return 'Unknown'
    const m = memberRows.find((x) => x.id === uid)
    return m?.display_name ?? m?.email ?? 'Unknown'
  }

  // ── Per-person load ────────────────────────────────────────────────────────
  const dayIndex = new Map<string, number>(CONFERENCE_DAYS.map((d, i) => [d.iso as string, i]))
  const perPerson: PerPersonLoad[] = memberRows.map((m) => {
    const byDay = CONFERENCE_DAYS.map(() => 0)
    let unscheduled = 0
    let total = 0
    for (const mt of meetingRows) {
      if (mt.owner_id !== m.id) continue
      if (mt.status === 'cancelled' || mt.status === 'no_show') continue
      total++
      const day = isoDay(mt.scheduled_at)
      const idx = day ? dayIndex.get(day) : undefined
      if (idx !== undefined) byDay[idx]++
      else if (mt.status === 'want_to_meet') unscheduled++
    }
    return {
      user_id: m.id,
      display_name: m.display_name ?? m.email,
      byDay,
      unscheduled,
      total,
    }
  })

  // ── Priority coverage (per priority tier) ──────────────────────────────────
  // "Covered" = attendee has at least one non-cancelled meeting (any status)
  const activeAttendeeIds = new Set<string>()
  for (const mt of meetingRows) {
    if (mt.status === 'cancelled' || mt.status === 'no_show') continue
    activeAttendeeIds.add(mt.attendee_id)
  }

  const priorityBuckets = new Map<number, { total: number; covered: number }>()
  for (const a of attendeeRows) {
    if (!a.priority) continue
    const b = priorityBuckets.get(a.priority) ?? { total: 0, covered: 0 }
    b.total++
    if (activeAttendeeIds.has(a.id)) b.covered++
    priorityBuckets.set(a.priority, b)
  }
  const priorityCoverage: PriorityCoverage[] = [5, 4, 3, 2, 1]
    .filter((p) => priorityBuckets.has(p))
    .map((p) => ({ priority: p, ...priorityBuckets.get(p)! }))

  // ── Category coverage ──────────────────────────────────────────────────────
  const categoryBuckets = new Map<string, { total: number; covered: number }>()
  for (const a of attendeeRows) {
    if (!a.priority_category) continue
    const b = categoryBuckets.get(a.priority_category) ?? { total: 0, covered: 0 }
    b.total++
    if (activeAttendeeIds.has(a.id)) b.covered++
    categoryBuckets.set(a.priority_category, b)
  }
  const categoryCoverage: CategoryCoverage[] = Array.from(categoryBuckets.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total)

  // ── Sync health ────────────────────────────────────────────────────────────
  const syncHealth: SyncHealth[] = memberRows.map((m) => {
    const r = icalMap.get(m.id)
    return {
      user_id: m.id,
      display_name: m.display_name ?? m.email,
      has_url: !!r?.url,
      last_synced_at: r?.last_synced_at ?? null,
      last_sync_error: r?.last_sync_error ?? null,
    }
  })

  // ── Want-to-meet aging (oldest 10) ────────────────────────────────────────
  const attendeeById = new Map(attendeeRows.map((a) => [a.id, a]))
  const wantToMeet = meetingRows
    .filter((m) => m.status === 'want_to_meet')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, 10)
  const now = Date.now()
  const wantToMeetAging: WantToMeetAging[] = wantToMeet.map((m) => {
    const a = attendeeById.get(m.attendee_id)
    const name = a ? `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || 'Unknown' : 'Unknown'
    return {
      meeting_id: m.id,
      attendee_id: m.attendee_id,
      attendee_name: name,
      owner_name: nameFor(m.owner_id),
      created_at: m.created_at,
      days_old: Math.floor((now - new Date(m.created_at).getTime()) / 86_400_000),
      priority: a?.priority ?? null,
    }
  })

  // ── Gaps list — priority 5 or 4 with no activity ──────────────────────────
  const gapsList: GapAttendee[] = attendeeRows
    .filter((a) => (a.priority === 5 || a.priority === 4) && !activeAttendeeIds.has(a.id))
    .map((a) => ({
      id: a.id,
      first_name: a.first_name,
      last_name: a.last_name,
      company: a.company,
      priority: a.priority!,
      priority_category: a.priority_category,
    }))
    .sort((a, b) => b.priority - a.priority || (a.last_name ?? '').localeCompare(b.last_name ?? ''))

  return {
    perPerson,
    priorityCoverage,
    categoryCoverage,
    syncHealth,
    wantToMeetAging,
    gapsList,
  }
}
