import Link from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ImportWidget } from './_components/import-widget'
import { ExportWidget } from './_components/export-widget'
import { PriorityImportWidget } from './_components/priority-import-widget'
import { SyncAllButton } from './_components/sync-all-button'
import { getAdminOpStats, CONFERENCE_DAYS } from '@/lib/admin-stats'

type TagWithCount = { id: string; name: string; color: string; count: number }

export const dynamic = 'force-dynamic'

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
    <div className="rounded-lg border border-border/60 bg-card px-5 py-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold mt-0.5 tabular-nums">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, total, color = 'var(--color-teal)' }: { value: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground w-14 text-right">
        {value}/{total}
      </span>
    </div>
  )
}

function MiniBars({ values, max }: { values: number[]; max: number }) {
  const ceiling = Math.max(max, 1)
  return (
    <div className="flex items-end gap-1 h-8">
      {values.map((v, i) => {
        const h = Math.round((v / ceiling) * 100)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            <div
              className="w-full rounded-sm bg-[var(--color-teal)]/70 transition-all"
              style={{ height: `${Math.max(h, v > 0 ? 8 : 2)}%`, minHeight: v > 0 ? 4 : 2 }}
              title={`${v}`}
            />
          </div>
        )
      })}
    </div>
  )
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

const PRIORITY_COLOURS: Record<number, string> = {
  5: '#DC2626',
  4: '#EA580C',
  3: '#D97706',
  2: '#65A30D',
  1: '#475569',
}

export default async function AdminPage() {
  const [stats, ops] = await Promise.all([getStats(), getAdminOpStats()])

  const maxLoad = Math.max(1, ...ops.perPerson.flatMap((p) => p.byDay))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      <h1 className="editorial-h1 text-3xl text-foreground">Admin</h1>

      {/* Headline counts */}
      <section>
        <h2 className="editorial-eyebrow text-muted-foreground mb-3">Database</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Attendees" value={stats.attendees} />
          <StatCard label="Team members" value={stats.teamMembers} />
          <StatCard label="Want to meet" value={stats.wantToMeet} sub="no time yet" />
          <StatCard label="Scheduled" value={stats.scheduled} sub={`${stats.meetingsDone} done`} />
        </div>
      </section>

      {/* Per-person meeting load */}
      <section>
        <h2 className="editorial-eyebrow text-muted-foreground mb-3">Per-person load</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ops.perPerson.map((p) => (
            <div key={p.user_id} className="rounded-lg border border-border/60 bg-card px-4 py-3 shadow-sm">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="text-sm font-semibold truncate">{p.display_name}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  <span className="text-foreground font-semibold">{p.total}</span> total
                  {p.unscheduled > 0 && <span> · {p.unscheduled} unsched</span>}
                </p>
              </div>
              <MiniBars values={p.byDay} max={maxLoad} />
              <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                {CONFERENCE_DAYS.map((d, i) => (
                  <span key={d.iso} className="flex-1 text-center">
                    {d.label} <span className="text-foreground/80">{p.byDay[i]}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Priority coverage */}
      {ops.priorityCoverage.length > 0 && (
        <section>
          <h2 className="editorial-eyebrow text-muted-foreground mb-3">Priority coverage</h2>
          <div className="rounded-lg border border-border/60 bg-card divide-y divide-border/60 shadow-sm">
            {ops.priorityCoverage.map((p) => (
              <div key={p.priority} className="px-4 py-2.5 flex items-center gap-3">
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold text-white shrink-0"
                  style={{ backgroundColor: PRIORITY_COLOURS[p.priority] }}
                >
                  P{p.priority}
                </span>
                <div className="flex-1 min-w-0">
                  <ProgressBar value={p.covered} total={p.total} color={PRIORITY_COLOURS[p.priority]} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Category coverage */}
      {ops.categoryCoverage.length > 0 && (
        <section>
          <h2 className="editorial-eyebrow text-muted-foreground mb-3">Coverage by category</h2>
          <div className="rounded-lg border border-border/60 bg-card divide-y divide-border/60 shadow-sm">
            {ops.categoryCoverage.map((c) => (
              <div key={c.category} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-sm font-medium truncate w-40">{c.category}</span>
                <div className="flex-1 min-w-0">
                  <ProgressBar value={c.covered} total={c.total} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gaps — priority attendees with no Pulse activity */}
      <section>
        <h2 className="editorial-eyebrow text-muted-foreground mb-3">
          Gaps
          <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/70">
            P5/P4 attendees with no meeting or want-to-meet · {ops.gapsList.length}
          </span>
        </h2>
        {ops.gapsList.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-border/60 bg-emerald-50 px-4 py-3">
            Every priority attendee has at least one meeting or want-to-meet flag. Nice.
          </p>
        ) : (
          <ul className="rounded-lg border border-border/60 bg-card divide-y divide-border/60 shadow-sm max-h-80 overflow-auto">
            {ops.gapsList.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/attendees/${g.id}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40 transition-colors"
                >
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold text-white shrink-0"
                    style={{ backgroundColor: PRIORITY_COLOURS[g.priority] }}
                  >
                    P{g.priority}
                  </span>
                  <span className="text-sm font-medium truncate flex-1">
                    {[g.first_name, g.last_name].filter(Boolean).join(' ') || 'Unknown'}
                  </span>
                  {g.company && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">{g.company}</span>
                  )}
                  {g.priority_category && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
                      {g.priority_category}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Want-to-meet aging */}
      {ops.wantToMeetAging.length > 0 && (
        <section>
          <h2 className="editorial-eyebrow text-muted-foreground mb-3">
            Oldest want-to-meets
            <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/70">
              still unscheduled
            </span>
          </h2>
          <ul className="rounded-lg border border-border/60 bg-card divide-y divide-border/60 shadow-sm">
            {ops.wantToMeetAging.map((w) => (
              <li key={w.meeting_id}>
                <Link
                  href={`/meetings/${w.meeting_id}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40 transition-colors"
                >
                  {w.priority ? (
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold text-white shrink-0"
                      style={{ backgroundColor: PRIORITY_COLOURS[w.priority] }}
                    >
                      P{w.priority}
                    </span>
                  ) : (
                    <span className="w-6 shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate flex-1">{w.attendee_name}</span>
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                    flagged by {w.owner_name}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {w.days_old}d old
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Calendar sync health */}
      <section>
        <h2 className="editorial-eyebrow text-muted-foreground mb-3">Calendar sync</h2>
        <ul className="rounded-lg border border-border/60 bg-card divide-y divide-border/60 shadow-sm mb-3">
          {ops.syncHealth.map((s) => {
            const ok = s.has_url && !s.last_sync_error
            const stale = s.has_url && s.last_synced_at
              ? Date.now() - new Date(s.last_synced_at).getTime() > 60 * 60 * 1000
              : false
            const dotClass = !s.has_url
              ? 'bg-muted-foreground/40'
              : s.last_sync_error
              ? 'bg-red-500'
              : stale
              ? 'bg-amber-500'
              : 'bg-emerald-500'
            return (
              <li key={s.user_id} className="px-4 py-2.5 flex items-center gap-3">
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                <span className="text-sm font-medium truncate w-40">{s.display_name}</span>
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {!s.has_url ? (
                    <span className="italic">no calendar connected</span>
                  ) : s.last_sync_error ? (
                    <span className="text-red-600 truncate">{s.last_sync_error}</span>
                  ) : (
                    <>last synced {relativeTime(s.last_synced_at)}</>
                  )}
                </span>
                {ok && stale && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-700">stale</span>
                )}
              </li>
            )
          })}
        </ul>
        <SyncAllButton />
      </section>

      {/* Tags breakdown */}
      <section>
        <h2 className="editorial-eyebrow text-muted-foreground mb-3">
          Tags
          <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted-foreground/70">
            {stats.tagsWithCounts.length} tag{stats.tagsWithCounts.length === 1 ? '' : 's'} · {stats.tagAssignments.toLocaleString()} assignment{stats.tagAssignments === 1 ? '' : 's'}
          </span>
        </h2>
        {stats.tagsWithCounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet — create them on an attendee&apos;s page or via /me/tags.</p>
        ) : (
          <ul className="rounded-lg border border-border/60 bg-card divide-y divide-border/60 shadow-sm">
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

      <section>
        <h2 className="editorial-eyebrow text-muted-foreground mb-1">Import attendees</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Upload the Swapcard .xlsx export. Re-importing is safe — rows are upserted by Swapcard URL.
        </p>
        <ImportWidget />
      </section>

      <section>
        <h2 className="editorial-eyebrow text-muted-foreground mb-1">Import CEEALAR priority list</h2>
        <p className="text-sm text-muted-foreground mb-3">
          XLSX with Rank, Category, Why Relevant, Talking Points, Swapcard URL columns. Your in-app edits are preserved — the spreadsheet&apos;s version shows as &ldquo;Spreadsheet says…&rdquo; on the profile.
        </p>
        <PriorityImportWidget />
      </section>

      <section>
        <h2 className="editorial-eyebrow text-muted-foreground mb-1">Export data</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Downloads a CSV with all {stats.attendees.toLocaleString()} attendees and full detail of their most recent meeting.
        </p>
        <ExportWidget />
      </section>
    </div>
  )
}
