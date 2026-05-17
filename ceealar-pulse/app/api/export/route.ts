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
  seeking_work: string | null
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

type ActionItemRow = { text: string; done: boolean }

type MeetingRow = {
  attendee_id: string
  status: string
  scheduled_at: string | null
  duration_minutes: number | null
  location: string | null
  why_relevant: string | null
  talking_points: string | null
  meeting_notes: string | null
  comments: string | null
  follow_up_date: string | null
  source: string | null
  created_at: string
  action_items: ActionItemRow[]
}

type MeetingSummary = {
  meeting_count: number
  last_status: string
  last_scheduled_at: string | null
  last_duration_minutes: number | null
  last_location: string | null
  last_why_relevant: string | null
  last_talking_points: string | null
  last_meeting_notes: string | null
  last_comments: string | null
  last_follow_up_date: string | null
  last_source: string | null
  all_action_items: string  // concatenated text from all meetings
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
    .range(0, 9999)

  if (attendeesError) {
    return new Response(`Failed to fetch attendees: ${attendeesError.message}`, { status: 500 })
  }

  const attendees = (attendeesRaw ?? []) as unknown as AttendeeWithTags[]

  // Query 2: Meetings with full detail + action items, ordered by created_at desc
  // so first entry per attendee = most recent meeting.
  const { data: meetingsRaw, error: meetingsError } = await adminClient
    .from('meetings')
    .select('attendee_id, status, scheduled_at, duration_minutes, location, why_relevant, talking_points, meeting_notes, comments, follow_up_date, source, created_at, action_items(text, done)')
    .order('created_at', { ascending: false })

  if (meetingsError) {
    return new Response(`Failed to fetch meetings: ${meetingsError.message}`, { status: 500 })
  }

  const meetings = (meetingsRaw ?? []) as unknown as MeetingRow[]

  // Build attendee_id -> MeetingSummary map
  const meetingMap = new Map<string, MeetingSummary>()

  function actionItemText(ai: ActionItemRow): string {
    return `${ai.done ? '[x]' : '[ ]'} ${ai.text}`
  }

  for (const m of meetings) {
    const items = m.action_items ?? []
    const openCount = items.filter((ai) => !ai.done).length
    const itemTexts = items.map(actionItemText)

    const existing = meetingMap.get(m.attendee_id)
    if (!existing) {
      // First occurrence is the most recent (ordered desc) — capture all detail
      meetingMap.set(m.attendee_id, {
        meeting_count: 1,
        last_status: m.status,
        last_scheduled_at: m.scheduled_at,
        last_duration_minutes: m.duration_minutes,
        last_location: m.location,
        last_why_relevant: m.why_relevant,
        last_talking_points: m.talking_points,
        last_meeting_notes: m.meeting_notes,
        last_comments: m.comments,
        last_follow_up_date: m.follow_up_date,
        last_source: m.source,
        all_action_items: itemTexts.join('\n'),
        open_action_items: openCount,
      })
    } else {
      // Subsequent meetings (older) — accumulate counts + action item text only
      meetingMap.set(m.attendee_id, {
        ...existing,
        meeting_count: existing.meeting_count + 1,
        open_action_items: existing.open_action_items + openCount,
        all_action_items: [existing.all_action_items, ...itemTexts].filter(Boolean).join('\n'),
      })
    }
  }

  // CSV header — every attendee + meeting field
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
    'last_meeting_scheduled_at',
    'last_meeting_duration_minutes',
    'last_meeting_location',
    'last_meeting_source',
    'last_meeting_why_relevant',
    'last_meeting_talking_points',
    'last_meeting_notes',
    'last_meeting_comments',
    'last_meeting_follow_up_date',
    'all_action_items',
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
      csvCell(a.seeking_work),
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
      summary ? csvCell(summary.last_scheduled_at) : '',
      summary?.last_duration_minutes ? String(summary.last_duration_minutes) : '',
      summary ? csvCell(summary.last_location) : '',
      summary ? csvCell(summary.last_source) : '',
      summary ? csvCell(summary.last_why_relevant) : '',
      summary ? csvCell(summary.last_talking_points) : '',
      summary ? csvCell(summary.last_meeting_notes) : '',
      summary ? csvCell(summary.last_comments) : '',
      summary ? csvCell(summary.last_follow_up_date) : '',
      summary ? csvCell(summary.all_action_items) : '',
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
