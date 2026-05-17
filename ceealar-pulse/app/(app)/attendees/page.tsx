import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * The right-column placeholder on desktop. On mobile this page never
 * renders (the layout's <AttendeesShell> hides the right column when
 * pathname === '/attendees').
 */
export default function AttendeesPage() {
  return (
    <div className="flex items-center justify-center p-8 h-full">
      <div className="text-center max-w-sm fade-up">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--color-teal)]/10 flex items-center justify-center mb-4">
          <span className="text-2xl">👋</span>
        </div>
        <p className="font-medium text-base text-foreground">Pick someone to start</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tap an attendee to see their profile, strategic context, and meeting history.
        </p>
        <Link
          href="/meetings"
          className="inline-block mt-4 text-sm text-[var(--color-teal)] hover:underline"
        >
          Or jump to your schedule →
        </Link>
      </div>
    </div>
  )
}
