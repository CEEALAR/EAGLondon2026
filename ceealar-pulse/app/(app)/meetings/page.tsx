import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MeetingsSidebar } from './_components/meetings-sidebar'
import { MyDayPanel } from './_components/my-day-panel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-6 md:px-4 md:py-4">
      {/* Left column: schedule */}
      <div className="px-3 py-4 md:p-0 md:sticky md:top-14 md:self-start md:max-h-[calc(100vh-3.5rem)] md:overflow-auto">
        <h1 className="text-xl font-semibold mb-4 text-foreground">Schedule</h1>
        {user && <MyDayPanel userId={user.id} />}
        <MeetingsSidebar />
      </div>

      {/* Right column: only shows on desktop, prompts user to pick a meeting */}
      <div className="hidden md:flex md:items-center md:justify-center md:min-h-[60vh] md:border md:border-dashed md:border-border md:rounded-lg md:text-muted-foreground md:text-sm">
        <div className="text-center px-6">
          <p className="font-medium text-base text-foreground mb-1">Select a meeting</p>
          <p>Tap a block on the schedule to see notes and action items.</p>
          <Link
            href="/attendees"
            className="inline-block mt-3 text-[var(--color-teal)] underline underline-offset-2"
          >
            Or browse attendees →
          </Link>
        </div>
      </div>
    </div>
  )
}
