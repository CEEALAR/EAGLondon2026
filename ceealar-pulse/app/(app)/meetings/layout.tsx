/**
 * Master-detail wrapper for /meetings and /meetings/[id].
 * Layout lives at the /meetings segment (not /[id]) so the sidebar
 * persists between the placeholder and the detail — no blank flash.
 */

import { createClient } from '@/lib/supabase/server'
import { MeetingsSidebar } from './_components/meetings-sidebar'
import { MeetingsShell } from './_components/meetings-shell'
import { MyDayPanel } from './_components/my-day-panel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function MeetingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <MeetingsShell
      sidebar={
        <div className="px-3 py-4 md:p-0">
          <h1 className="text-xl font-semibold mb-4 text-foreground">Schedule</h1>
          {user && <MyDayPanel userId={user.id} />}
          <MeetingsSidebar />
        </div>
      }
      detail={children}
    />
  )
}
