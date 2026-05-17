import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ImportWidget } from './_components/import-widget'
import { ExportWidget } from './_components/export-widget'

type TagWithCount = { id: string; name: string; color: string; count: number }

async function getStats() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [
    { count: attendees },
    { count: wantToMeet },
    { count: scheduled },
    { count: meetingsDone },
    { count: actionItems },
    { count: actionItemsDone },
    { data: tagsRaw },
    { data: tagAssignmentsRaw },
    { count: teamMembers },
  ] = await Promise.all([
    admin.from('attendees').select('*', { count: 'exact', head: true }),
    admin.from('meetings').select('*', { count: 'exact', head: true }).eq('status', 'want_to_meet'),
    admin.from('meetings').select('*', { count: 'exact', head: true }).in('status', ['planned', 'done']),
    admin.from('meetings').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    admin.from('action_items').select('*', { count: 'exact', head: true }),
    admin.from('action_items').select('*', { count: 'exact', head: true }).eq('done', true),
    admin.from('tags').select('id, name, color').order('name'),
    admin.from('attendee_tags').select('tag_id'),
    admin.from('team_members').select('*', { count: 'exact', head: true }),
  ])

  // Build per-tag attendee count
  const assignmentCounts = new Map<string, number>()
  for (const row of (tagAssignmentsRaw ?? []) as Array<{ tag_id: string }>) {
    assignmentCounts.set(row.tag_id, (assignmentCounts.get(row.tag_id) ?? 0) + 1)
  }

  const tagsWithCounts: TagWithCount[] = ((tagsRaw ?? []) as Array<{ id: string; name: string; color: string }>)
    .map((t) => ({ ...t, count: assignmentCounts.get(t.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  return {
    attendees: attendees ?? 0,
    wantToMeet: wantToMeet ?? 0,
    scheduled: scheduled ?? 0,
    meetingsDone: meetingsDone ?? 0,
    actionItems: actionItems ?? 0,
    actionItemsDone: actionItemsDone ?? 0,
    tagsWithCounts,
    tagAssignments: (tagAssignmentsRaw ?? []).length,
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
          <StatCard label="Want to meet" value={stats.wantToMeet} sub="no time yet" />
          <StatCard
            label="Scheduled meetings"
            value={stats.scheduled}
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

      {/* Tags breakdown */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Tags
          <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/70">
            {stats.tagsWithCounts.length} tag{stats.tagsWithCounts.length === 1 ? '' : 's'} · {stats.tagAssignments.toLocaleString()} assignment{stats.tagAssignments === 1 ? '' : 's'}
          </span>
        </h2>
        {stats.tagsWithCounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet — create them on an attendee&apos;s page or via /me/tags.</p>
        ) : (
          <ul className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {stats.tagsWithCounts.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-sm font-medium truncate">{t.name}</span>
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {t.count.toLocaleString()} {t.count === 1 ? 'person' : 'people'}
                </span>
              </li>
            ))}
          </ul>
        )}
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
          Downloads a CSV with all {stats.attendees.toLocaleString()} attendees — every Swapcard field, strategic context, tags, and full detail of each attendee&apos;s most recent meeting (status, time, location, why relevant, talking points, notes, comments, follow-up, all action items).
        </p>
        <ExportWidget />
      </section>
    </div>
  )
}
