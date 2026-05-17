import Link from 'next/link'
import { AttendeesSidebar } from './_components/attendees-sidebar'

export const dynamic = 'force-dynamic'

export default function AttendeesPage() {
  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:h-[calc(100vh-3.5rem)]">
      {/* Mobile: full-width list. Desktop: left column. */}
      <div className="md:border-r md:border-border/60 flex flex-col min-h-0">
        <AttendeesSidebar />
      </div>

      {/* Right column: only visible on desktop, prompts user to pick someone */}
      <div className="hidden md:flex md:items-center md:justify-center md:p-8 md:min-h-0">
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
    </div>
  )
}
