import { ExternalLink } from 'lucide-react'
import { safeHttpUrl } from '@/lib/utils'

type Attendee = {
  biography: string | null
  expertise: string[] | null
  interests: string[] | null
  how_others_can_help: string | null
  how_i_can_help: string | null
  country: string | null
  career_stage: string | null
  seeking_work: string | null
  recruitment: string | null
  swapcard_url: string
  linkedin: string | null
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground">{children}</p>
    </div>
  )
}

/**
 * Renders the full Swapcard profile for an attendee.
 * Shared between /attendees/[id] (full page) and /meetings/[id] (below meeting info).
 */
export function AttendeeProfileSection({ attendee }: { attendee: Attendee }) {
  const isSyntheticUrl = attendee.swapcard_url.startsWith('synthetic://')
  const swapcardSafe = safeHttpUrl(attendee.swapcard_url)
  const linkedinSafe = safeHttpUrl(attendee.linkedin)

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card">
      <h2 className="text-lg font-semibold mb-3">Profile</h2>

      <ProfileField label="Biography">
        <span className="whitespace-pre-wrap">{attendee.biography ?? '-'}</span>
      </ProfileField>

      <ProfileField label="Areas of Expertise">
        {attendee.expertise?.length ? attendee.expertise.join(', ') : '-'}
      </ProfileField>

      <ProfileField label="Areas of Interest">
        {attendee.interests?.length ? attendee.interests.join(', ') : '-'}
      </ProfileField>

      <ProfileField label="How Others Can Help Me">
        <span className="whitespace-pre-wrap">{attendee.how_others_can_help ?? '-'}</span>
      </ProfileField>

      <ProfileField label="How I Can Help Others">
        <span className="whitespace-pre-wrap">{attendee.how_i_can_help ?? '-'}</span>
      </ProfileField>

      <ProfileField label="Country">{attendee.country ?? '-'}</ProfileField>
      <ProfileField label="Career Stage">{attendee.career_stage ?? '-'}</ProfileField>

      <ProfileField label="Seeking Work">{attendee.seeking_work ?? '-'}</ProfileField>

      <ProfileField label="Recruitment">{attendee.recruitment ?? '-'}</ProfileField>

      <ProfileField label="Swapcard">
        {isSyntheticUrl || !swapcardSafe ? (
          <span className="text-muted-foreground">No Swapcard profile</span>
        ) : (
          <a
            href={swapcardSafe}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-teal)] hover:underline inline-flex items-center gap-1"
          >
            Open in Swapcard <ExternalLink size={12} />
          </a>
        )}
      </ProfileField>

      <ProfileField label="LinkedIn">
        {linkedinSafe ? (
          <a
            href={linkedinSafe}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-teal)] hover:underline inline-flex items-center gap-1 break-all"
          >
            {linkedinSafe.replace(/^https?:\/\//, '')} <ExternalLink size={12} className="shrink-0" />
          </a>
        ) : (
          '-'
        )}
      </ProfileField>
    </div>
  )
}
