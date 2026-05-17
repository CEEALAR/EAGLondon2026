'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExternalLink, RefreshCw, Trash2 } from 'lucide-react'

type CalendarInfo = {
  url: string
  last_synced_at: string | null
  last_sync_error: string | null
  created_at: string
} | null

type Preview = {
  totalEvents: number
  meetEvents: number
  preview: Array<{ summary: string; candidateName: string | null; startAt: string }>
}

interface Props {
  initialCalendar: CalendarInfo
}

export function CalendarSection({ initialCalendar }: Props) {
  const router = useRouter()
  const [calendar, setCalendar] = useState<CalendarInfo>(initialCalendar)
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState<null | 'test' | 'save' | 'sync' | 'disconnect'>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)

  function reportError(msg: string) {
    setInlineError(msg)
    toast.error(msg)
  }

  async function handleTest() {
    setPreview(null)
    setInlineError(null)
    setBusy('test')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    try {
      const res = await fetch('/api/me/calendar/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      })
      const ct = res.headers.get('content-type') ?? ''
      let data: { error?: string; totalEvents?: number; meetEvents?: number; preview?: Preview['preview'] } | null = null
      if (ct.includes('application/json')) {
        data = await res.json().catch(() => null)
      } else {
        const text = await res.text().catch(() => '')
        reportError(`Server returned ${res.status}: ${text.slice(0, 120) || 'no body'}`)
        return
      }
      if (!res.ok) {
        reportError(data?.error ?? `Test failed (HTTP ${res.status})`)
        return
      }
      setPreview(data as Preview)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        reportError('Test timed out after 25 seconds — try again')
      } else {
        reportError(e instanceof Error ? e.message : 'Network error')
      }
    } finally {
      clearTimeout(timeout)
      setBusy(null)
    }
  }

  async function handleSave() {
    setBusy('save')
    try {
      const res = await fetch('/api/me/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        reportError(data?.error ?? `Save failed (HTTP ${res.status})`)
        return
      }
      toast.success('Calendar connected — syncing now…')
      await fetch('/api/me/calendar/sync?force=1', { method: 'POST' }).catch(() => null)
      router.refresh()
    } catch (e) {
      reportError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setBusy(null)
    }
  }

  async function handleSync() {
    setBusy('sync')
    try {
      const res = await fetch('/api/me/calendar/sync?force=1', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        reportError(data?.error ?? `Sync failed (HTTP ${res.status})`)
        return
      }
      const summary = [
        data.created && `${data.created} created`,
        data.promoted && `${data.promoted} promoted`,
        data.updated && `${data.updated} updated`,
        data.cancelled && `${data.cancelled} cancelled`,
        data.unmatched && `${data.unmatched} unmatched`,
      ].filter(Boolean).join(' · ')
      toast.success(summary || 'No changes from feed')
      router.refresh()
    } catch (e) {
      reportError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setBusy(null)
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect calendar? Existing iCal-sourced meetings will stay but stop updating.')) return
    setBusy('disconnect')
    try {
      await fetch('/api/me/calendar', { method: 'DELETE' })
      setCalendar(null)
      setUrl('')
      setPreview(null)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  // ── Connected state ────────────────────────────────────────────────────────
  if (calendar) {
    const lastSync = calendar.last_synced_at
      ? new Date(calendar.last_synced_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : 'never'
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm space-y-1">
          <p className="font-medium text-green-800">Calendar connected</p>
          <p className="text-green-700 text-xs">Last sync: {lastSync}</p>
          {calendar.last_sync_error && (
            <p className="text-red-700 text-xs mt-1 break-words">⚠ {calendar.last_sync_error}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSync} disabled={busy !== null} size="sm" variant="outline">
            <RefreshCw size={14} className="mr-1" />
            {busy === 'sync' ? 'Syncing…' : 'Sync now'}
          </Button>
          <Button onClick={handleDisconnect} disabled={busy !== null} size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 size={14} className="mr-1" />
            Disconnect
          </Button>
        </div>
      </div>
    )
  }

  // ── Empty state with 3-step guide ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Auto-import your Swapcard 1:1s. Setup takes 2 minutes.
      </p>

      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-teal)] text-white text-xs font-semibold flex items-center justify-center">1</span>
          <div className="flex-1">
            <p className="font-medium">Link Swapcard to your Google Calendar</p>
            <p className="text-muted-foreground text-xs">
              Open{' '}
              <a
                href="https://app.swapcard.com/event/eag-london/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-teal)] hover:underline inline-flex items-center gap-0.5"
              >
                Swapcard settings <ExternalLink size={11} />
              </a>{' '}
              and enable <span className="font-medium">Sync to my Google Calendar</span>.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-teal)] text-white text-xs font-semibold flex items-center justify-center">2</span>
          <div className="flex-1">
            <p className="font-medium">Find the Swapcard calendar in Google</p>
            <p className="text-muted-foreground text-xs">
              Go to{' '}
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-teal)] hover:underline inline-flex items-center gap-0.5"
              >
                calendar.google.com <ExternalLink size={11} />
              </a>{' '}
              and look under <span className="font-medium">Other calendars</span> for the auto-created EAG London calendar.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-teal)] text-white text-xs font-semibold flex items-center justify-center">3</span>
          <div className="flex-1">
            <p className="font-medium">
              Copy the{' '}
              <mark className="bg-[var(--color-gold)]/30 text-foreground rounded px-1 py-0.5 font-semibold">
                Secret
              </mark>
              {' '}iCal URL
            </p>
            <p className="text-muted-foreground text-xs">
              Hover the calendar → 3-dot menu → <span className="font-medium">Settings and sharing</span> → scroll to{' '}
              <mark className="bg-[var(--color-gold)]/30 text-foreground rounded px-1 py-0.5 font-semibold">
                Secret address in iCal format
              </mark>{' '}
              → copy the URL.
            </p>
            <p className="text-[11px] text-red-600 mt-1">
              ⚠ Not the &lsquo;Public address&rsquo; — it won&apos;t include your 1:1s.
            </p>
          </div>
        </li>
      </ol>

      <div className="space-y-2 pt-2">
        <Input
          placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy !== null}
        />
        <div className="flex gap-2">
          <Button onClick={handleTest} disabled={busy !== null || !url.trim()} size="sm" variant="outline">
            {busy === 'test' ? 'Testing…' : 'Test sync'}
          </Button>
          {preview && (
            <Button onClick={handleSave} disabled={busy !== null} size="sm" className="bg-[var(--color-teal)] text-white hover:bg-[var(--color-teal)]/90">
              {busy === 'save' ? 'Saving…' : 'Connect calendar'}
            </Button>
          )}
        </div>
      </div>

      {inlineError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠ {inlineError}
        </div>
      )}

      {preview && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs space-y-2">
          <p className="font-medium text-sm">
            Found {preview.meetEvents} EAG London 2026 meeting{preview.meetEvents === 1 ? '' : 's'} ({preview.totalEvents} total events in feed, filtered to 28 May – 1 Jun)
          </p>
          {preview.preview.length > 0 ? (
            <ul className="space-y-1 text-muted-foreground">
              {preview.preview.map((e, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">{e.summary}</span>
                  {' — '}
                  {new Date(e.startAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No &lsquo;Meet *&rsquo; events found yet. You can still connect — they&apos;ll appear once you book 1:1s in Swapcard.</p>
          )}
        </div>
      )}
    </div>
  )
}
