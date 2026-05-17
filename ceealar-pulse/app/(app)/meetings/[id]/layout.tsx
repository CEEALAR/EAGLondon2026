import { MeetingsSidebar } from '../_components/meetings-sidebar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default function MeetingDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-6 md:px-4 md:py-4">
      {/* Sidebar — visible only on desktop */}
      <aside className="hidden md:block md:sticky md:top-14 md:self-start md:max-h-[calc(100vh-3.5rem)] md:overflow-auto">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-2">Schedule</h2>
        <MeetingsSidebar />
      </aside>
      {/* Detail content */}
      <section className="min-w-0">
        {children}
      </section>
    </div>
  )
}
