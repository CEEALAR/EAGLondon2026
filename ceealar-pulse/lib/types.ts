// Shared TypeScript types for CEEALAR Pulse
// Imported by all Phase 2+ components — field names must match the attendees table schema exactly.

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
