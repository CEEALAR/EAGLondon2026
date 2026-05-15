import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Escape a CSV cell value per RFC 4180
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in double-quotes if cell contains comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

type AttendeeWithTags = {
  id: string
  swapcard_url: string
  first_name: string | null
  last_name: string | null
  company: string | null
  job_title: string | null
  career_stage: string | null
  biography: string | null
  expertise: string[] | null
  interests: string[] | null
  how_others_can_help: string | null
  how_i_can_help: string | null
  country: string | null
  seeking_work: boolean | null
  recruitment: string | null
  linkedin: string | null
  why_they_matter: string | null
  how_to_engage: string | null
  hypothesis: string | null
  risks: string | null
  collaboration_hooks: string | null
  created_at: string
  updated_at: string
  attendee_tags: { tag_id: string; tags: { name: string } | null }[]
}

type MeetingRow = {
  attendee_id: string
  status: string
  action_items: { done: boolean }[]
}

type MeetingSummary = {
  meeting_count: number
  last_status: string
  open_action_items: number
}

export async function GET() {
  // T-07-01: Auth check — must have a valid session before any DB query
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Service role admin client — bypasses RLS for full data export
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Query 1: All attendees with their tags
  const { data: attendeesRaw, error: attendeesError } = await adminClient
    .from('attendees')
    .select('*, attendee_tags(tag_id, tags(name))')
    .order('last_name')

  if (attendeesError) {
    return new Response(`Failed to fetch attendees: ${attendeesError.message}`, { status: 500 })
  }

  const attendees = (attendeesRaw ?? []) as unknown as AttendeeWithTags[]

  // Query 2: Meetings with action items, ordered by created_at desc so first entry per attendee = last meeting
  const { data: meetingsRaw, error: meetingsError } = await adminClient
    .from('meetings')
    .select('attendee_id, status, action_items(done)')
    .order('created_at', { ascending: false })

  if (meetingsError) {
    return new Response(`Failed to fetch meetings: ${meetingsError.message}`, { status: 500 })
  }

  const meetings = (meetingsRaw ?? []) as unknown as MeetingRow[]

  // Build attendee_id -> MeetingSummary map
  const meetingMap = new Map<string, MeetingSummary>()

  for (const m of meetings) {
    const existing = meetingMap.get(m.attendee_id)
    if (!existing) {
      // First occurrence is the most recent (ordered desc)
      const openItems = (m.action_items ?? []).filter((ai) => !ai.done).length
      meetingMap.set(m.attendee_id, {
        meeting_count: 1,
        last_status: m.status,
        open_action_items: openItems,
      })
    } else {
      // Subsequent meetings — increment count and open items
      const openItems = (m.action_items ?? []).filter((ai) => !ai.done).length
      meetingMap.set(m.attendee_id, {
        meeting_count: existing.meeting_count + 1,
        last_status: existing.last_status, // keep first (= most recent)
        open_action_items: existing.open_action_items + openItems,
      })
    }
  }

  // CSV header — exact order as specified
  const HEADERS = [
    'id',
    'swapcard_url',
    'first_name',
    'last_name',
    'company',
    'job_title',
    'career_stage',
    'biography',
    'expertise',
    'interests',
    'how_others_can_help',
    'how_i_can_help',
    'country',
    'seeking_work',
    'recruitment',
    'linkedin',
    'why_they_matter',
    'how_to_engage',
    'hypothesis',
    'risks',
    'collaboration_hooks',
    'tags',
    'meeting_count',
    'last_meeting_status',
    'open_action_items',
    'created_at',
    'updated_at',
  ]

  const lines: string[] = [HEADERS.join(',')]

  for (const a of attendees) {
    const summary = meetingMap.get(a.id)
    const tagNames = (a.attendee_tags ?? [])
      .map((at) => at.tags?.name ?? '')
      .filter(Boolean)
      .join(',')

    const row = [
      csvCell(a.id),
      csvCell(a.swapcard_url),
      csvCell(a.first_name),
      csvCell(a.last_name),
      csvCell(a.company),
      csvCell(a.job_title),
      csvCell(a.career_stage),
      csvCell(a.biography),
      csvCell((a.expertise ?? []).join(';')),
      csvCell((a.interests ?? []).join(';')),
      csvCell(a.how_others_can_help),
      csvCell(a.how_i_can_help),
      csvCell(a.country),
      a.seeking_work === null ? '' : a.seeking_work ? 'true' : 'false',
      csvCell(a.recruitment),
      csvCell(a.linkedin),
      csvCell(a.why_they_matter),
      csvCell(a.how_to_engage),
      csvCell(a.hypothesis),
      csvCell(a.risks),
      csvCell(a.collaboration_hooks),
      csvCell(tagNames),
      summary ? String(summary.meeting_count) : '0',
      summary ? csvCell(summary.last_status) : '',
      summary ? String(summary.open_action_items) : '0',
      csvCell(a.created_at),
      csvCell(a.updated_at),
    ]

    lines.push(row.join(','))
  }

  const csvString = lines.join('\r\n')

  return new Response(csvString, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="ceealar-pulse-export.csv"',
    },
  })
}
