// Shared TypeScript types for CEEALAR Pulse
// Imported by all Phase 2+ components — field names must match the attendees/meetings schema exactly.

export type Attendee = {
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
  // Strategic context — shared across team, not per-user
  why_they_matter: string | null
  how_to_engage: string | null
  hypothesis: string | null
  risks: string | null
  collaboration_hooks: string | null
  created_at: string
  updated_at: string
}

// ── Team Members ──────────────────────────────────────────────────────────────

export type TeamMember = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

// ── Meetings ──────────────────────────────────────────────────────────────────

export type MeetingStatus = 'want_to_meet' | 'planned' | 'done' | 'no_show' | 'cancelled'

export type Meeting = {
  id: string
  attendee_id: string
  owner_id: string | null
  status: MeetingStatus
  scheduled_at: string | null
  duration_minutes: number | null
  location: string | null
  /** prep_note is null for non-owners when status != 'done' (enforced by meetings_view) */
  prep_note: string | null
  summary: string | null
  meeting_notes: string | null
  comments: string | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
}

// Meeting joined with attendee name and owner display_name for list display
export type MeetingWithRelations = Meeting & {
  attendee_first_name: string | null
  attendee_last_name: string | null
  owner_display_name: string | null
}

// ── Action Items ──────────────────────────────────────────────────────────────

export type ActionItem = {
  id: string
  meeting_id: string
  created_by: string | null
  text: string
  due_date: string | null
  done: boolean
  done_at: string | null
  created_at: string
}

// ── Activity ──────────────────────────────────────────────────────────────────

export type ActivityAction =
  | 'meeting_created'
  | 'status_done'
  | 'action_item_added'
  | 'action_item_completed'

export type Activity = {
  id: string
  actor_id: string | null
  meeting_id: string | null
  attendee_id: string | null
  action: ActivityAction
  detail: Record<string, unknown> | null
  created_at: string
}
