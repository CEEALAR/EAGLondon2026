import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * Placeholder for the right column on desktop. On mobile this page is
 * hidden by <MeetingsShell> when no meeting is selected.
 */
export default function MeetingsPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] border border-dashed border-border rounded-lg text-muted-foreground p-8">
      <div className="text-center max-w-sm fade-up">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-teal)]/10 flex items-center justify-center mb-4">
          <span className="text-2xl">🗓️</span>
        </div>
        <p className="font-medium text-base text-foreground">Pick a meeting</p>
        <p className="text-sm mt-1">
          Tap a block on the schedule to see notes, action items, and the
          attendee&apos;s profile.
        </p>
        <Link
          href="/attendees"
          className="inline-block mt-3 text-sm text-[var(--color-teal)] hover:underline"
        >
          Or browse attendees →
        </Link>
      </div>
    </div>
  )
}
