'use client'

import { usePathname } from 'next/navigation'

/**
 * Responsive master-detail container. On mobile:
 *   - /attendees: shows only the sidebar (the list)
 *   - /attendees/[id]: shows only the detail
 * On desktop both are visible side-by-side.
 */
export function AttendeesShell({
  sidebar,
  detail,
}: {
  sidebar: React.ReactNode
  detail: React.ReactNode
}) {
  const pathname = usePathname()
  const isDetail = pathname.startsWith('/attendees/') && pathname !== '/attendees'

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:h-[calc(100vh-3.5rem)]">
      <aside
        className={`flex-col min-h-0 md:border-r md:border-border/60 md:flex ${
          isDetail ? 'hidden' : 'flex'
        }`}
      >
        {sidebar}
      </aside>
      <section
        className={`min-w-0 md:overflow-y-auto md:block ${
          isDetail ? 'block' : 'hidden'
        }`}
      >
        {detail}
      </section>
    </div>
  )
}
