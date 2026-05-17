import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ImportWidget } from './_components/import-widget'
import { ExportWidget } from './_components/export-widget'

async function getStats() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { count: attendees },
    { count: meetings },
    { count: meetingsDone },
    { count: actionItems },
    { count: actionItemsDone },
    { count: tags },
    { count: tagAssignments },
    { count: teamMembers },
  ] = await Promise.all([
    admin.from('attendees').select('*', { count: 'exact', head: true }),
    admin.from('meetings').select('*', { count: 'exact', head: true }).in('status', ['want_to_meet', 'planned', 'done']),
    admin.from('meetings').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    admin.from('action_items').select('*', { count: 'exact', head: true }),
    admin.from('action_items').select('*', { count: 'exact', head: true }).eq('done', true),
    admin.from('tags').select('*', { count: 'exact', head: true }),
    admin.from('attendee_tags').select('*', { count: 'exact', head: true }),
    admin.from('team_members').select('*', { count: 'exact', head: true }),
  ])

  return {
    attendees: attendees ?? 0,
    meetings: meetings ?? 0,
    meetingsDone: meetingsDone ?? 0,
    actionItems: actionItems ?? 0,
    actionItemsDone: actionItemsDone ?? 0,
    tags: tags ?? 0,
    tagAssignments: tagAssignments ?? 0,
    teamMembers: teamMembers ?? 0,
  }
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold mt-0.5">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

export default async function AdminPage() {
  const stats = await getStats()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {/* Stats */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Database</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Attendees" value={stats.attendees} />
          <StatCard label="Team members" value={stats.teamMembers} />
          <StatCard label="Tags" value={stats.tags} sub={`${stats.tagAssignments} assignments`} />
          <StatCard
            label="Meetings"
            value={stats.meetings}
            sub={`${stats.meetingsDone} done`}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <StatCard
            label="Action items"
            value={stats.actionItems}
            sub={`${stats.actionItemsDone} completed`}
          />
        </div>
      </section>

      {/* Import */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">Import attendees</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Upload the Swapcard .xlsx export. Re-importing is safe — rows are upserted by Swapcard URL.
        </p>
        <ImportWidget />
      </section>

      {/* Export */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">Export data</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Downloads a CSV with all {stats.attendees.toLocaleString()} attendees, strategic context, tags, and meeting summary (27 columns).
        </p>
        <ExportWidget />
      </section>
    </div>
  )
}
