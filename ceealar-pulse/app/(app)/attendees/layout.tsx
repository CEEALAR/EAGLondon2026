/**
 * Master-detail wrapper for /attendees and /attendees/[id].
 *
 * Lives at the /attendees segment (not /[id]) so the sidebar persists
 * between the placeholder and the detail — no blank flash on navigation.
 */

import { AttendeesSidebar } from './_components/attendees-sidebar'
import { AttendeesShell } from './_components/attendees-shell'

export const dynamic = 'force-dynamic'

export default function AttendeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AttendeesShell
      sidebar={<AttendeesSidebar />}
      detail={children}
    />
  )
}
