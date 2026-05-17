import { AttendeesSidebar } from '../_components/attendees-sidebar'

export const dynamic = 'force-dynamic'

export default function AttendeeDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:h-[calc(100vh-3.5rem)]">
      {/* Sidebar — visible only on desktop. Self-scrolls; AttendeeList already
          handles its own internal virtualization + height. */}
      <aside className="hidden md:flex md:flex-col md:border-r md:border-border/60 md:min-h-0">
        <AttendeesSidebar />
      </aside>
      {/* Detail content */}
      <section className="min-w-0 md:overflow-y-auto">
        {children}
      </section>
    </div>
  )
}
