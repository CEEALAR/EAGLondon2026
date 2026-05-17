'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type ResultRow = {
  user_id: string
  name: string
  created: number
  promoted: number
  updated: number
  cancelled: number
  unmatched: number
  error_count: number
}

export function SyncAllButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<ResultRow[] | null>(null)

  async function run() {
    setBusy(true)
    setResults(null)
    try {
      const res = await fetch('/api/admin/sync-all', { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      const data: { results: ResultRow[] } = await res.json()
      setResults(data.results)
      const totals = data.results.reduce(
        (a, r) => ({
          c: a.c + r.created, p: a.p + r.promoted, u: a.u + r.updated,
          x: a.x + r.cancelled, m: a.m + r.unmatched,
        }),
        { c: 0, p: 0, u: 0, x: 0, m: 0 }
      )
      toast.success(
        `Synced ${data.results.length} calendar${data.results.length === 1 ? '' : 's'} — ` +
        `+${totals.c} created, ${totals.u} updated, ${totals.p} promoted, ${totals.x} cancelled`
      )
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={run} disabled={busy}>
        <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Syncing all calendars…' : 'Force-sync every calendar'}
      </Button>
      {results && (
        <ul className="text-xs space-y-1 rounded-md border border-border/60 bg-muted/30 p-2">
          {results.map((r) => (
            <li key={r.user_id} className="tabular-nums">
              <span className="font-medium text-foreground">{r.name}</span>{' '}
              <span className="text-muted-foreground">
                +{r.created} new · {r.updated} updated · {r.promoted} promoted ·{' '}
                {r.cancelled} cancelled · {r.unmatched} unmatched
              </span>
              {r.error_count > 0 && (
                <span className="text-red-600"> · {r.error_count} error{r.error_count === 1 ? '' : 's'}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
