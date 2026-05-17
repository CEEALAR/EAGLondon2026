'use client'

import { usePathname } from 'next/navigation'

/**
 * Responsive master-detail container for /meetings. On mobile:
 *   - /meetings: shows only the sidebar (schedule)
 *   - /meetings/[id]: shows only the detail
 * On desktop both visible side-by-side.
 */
export function MeetingsShell({
  sidebar,
  detail,
}: {
  sidebar: React.ReactNode
  detail: React.ReactNode
}) {
  const pathname = usePathname()
  const isDetail = pathname.startsWith('/meetings/') && pathname !== '/meetings'

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-6 md:px-4 md:py-4 md:h-[calc(100vh-3.5rem)]">
      <aside
        className={`md:sticky md:top-14 md:self-start md:max-h-[calc(100vh-3.5rem)] md:overflow-auto ${
          isDetail ? 'hidden md:block' : 'block'
        }`}
      >
        {sidebar}
      </aside>
      <section
        className={`min-w-0 md:overflow-y-auto ${
          isDetail ? 'block' : 'hidden md:block'
        }`}
      >
        {detail}
      </section>
    </div>
  )
}
