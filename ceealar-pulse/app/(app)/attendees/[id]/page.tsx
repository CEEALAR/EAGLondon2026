import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { StrategicContextForm } from '@/app/(app)/attendees/_components/strategic-context-form'

export default async function AttendeeDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const supabase = await createClient()
  const { data: attendee } = await supabase
    .from('attendees')
    .select('*')
    .eq('id', id)
    .single()

  if (!attendee) {
    notFound()
  }

  const fullName =
    [attendee.first_name, attendee.last_name].filter(Boolean).join(' ') ||
    attendee.swapcard_url

  const subtitle = [attendee.company, attendee.job_title].filter(Boolean).join(' · ')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* Back navigation */}
      <Link href="/attendees" className="text-sm text-muted-foreground">
        ← Back to attendees
      </Link>

      {/* Section 1 — Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{fullName}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        {attendee.career_stage && (
          <p className="text-sm text-muted-foreground">{attendee.career_stage}</p>
        )}
        <div className="pt-2">
          {/* Phase 3: opens meeting create dialog */}
          <Button variant="default" disabled>
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Section 2 — Swapcard Profile */}
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        <h2 className="text-lg font-semibold mb-3">Profile</h2>

        <ProfileField label="Biography">
          <span className="whitespace-pre-wrap">
            {attendee.biography ?? '-'}
          </span>
        </ProfileField>

        <ProfileField label="Areas of Expertise">
          {attendee.expertise?.length ? attendee.expertise.join(', ') : '-'}
        </ProfileField>

        <ProfileField label="Areas of Interest">
          {attendee.interests?.length ? attendee.interests.join(', ') : '-'}
        </ProfileField>

        <ProfileField label="How Others Can Help Me">
          <span className="whitespace-pre-wrap">
            {attendee.how_others_can_help ?? '-'}
          </span>
        </ProfileField>

        <ProfileField label="How I Can Help Others">
          <span className="whitespace-pre-wrap">
            {attendee.how_i_can_help ?? '-'}
          </span>
        </ProfileField>

        <ProfileField label="Country">{attendee.country ?? '-'}</ProfileField>

        <ProfileField label="Career Stage">{attendee.career_stage ?? '-'}</ProfileField>

        <ProfileField label="Seeking Work">
          {attendee.seeking_work === true
            ? 'Yes'
            : attendee.seeking_work === false
            ? 'No'
            : '-'}
        </ProfileField>

        <ProfileField label="Recruitment">{attendee.recruitment ?? '-'}</ProfileField>

        <ProfileField label="Swapcard">
          <a
            href={attendee.swapcard_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            View on Swapcard
            <ExternalLink size={12} />
          </a>
        </ProfileField>

        <ProfileField label="LinkedIn">
          {attendee.linkedin ? (
            <a
              href={attendee.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              View on LinkedIn
              <ExternalLink size={12} />
            </a>
          ) : (
            '-'
          )}
        </ProfileField>
      </div>

      {/* Section 3 — CEEALAR Strategic Context */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-4">CEEALAR Strategic Context</h2>
        <StrategicContextForm
          attendeeId={attendee.id}
          initialValues={{
            why_they_matter: attendee.why_they_matter,
            how_to_engage: attendee.how_to_engage,
            hypothesis: attendee.hypothesis,
            risks: attendee.risks,
            collaboration_hooks: attendee.collaboration_hooks,
          }}
        />
      </div>

      {/* Section 4 — Tags (stub) */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-2">Tags</h2>
        <p className="text-sm text-muted-foreground">Tag management coming in Phase 4.</p>
        {/* Phase 4: tag chips with add/remove */}
      </div>

      {/* Section 5 — Team Meetings (stub) */}
      <div className="border rounded-lg p-4 bg-card">
        <h2 className="text-lg font-semibold mb-2">Team Meetings</h2>
        <p className="text-sm text-muted-foreground">Meeting history coming in Phase 3.</p>
        {/* Phase 3: list of meetings with this attendee */}
      </div>
    </div>
  )
}

function ProfileField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{children}</p>
    </div>
  )
}
