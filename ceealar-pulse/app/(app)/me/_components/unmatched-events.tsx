'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UnmatchedEvent = {
  id: string
  summary: string
  candidate_name: string | null
  start_at: string
  location: string | null
}

type AttendeeMini = {
  id: string
  first_name: string | null
  last_name: string | null
  company: string | null
}

interface Props {
  events: UnmatchedEvent[]
  attendees: AttendeeMini[]
}

export function UnmatchedEvents({ events: initialEvents, attendees }: Props) {
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const openEvent = events.find((e) => e.id === openId) ?? null

  const suggestions = useMemo(() => {
    if (!openEvent) return [] as AttendeeMini[]
    const q = (query || openEvent.candidate_name || '').toLowerCase().trim()
    if (!q) return [] as AttendeeMini[]
    return attendees
      .filter((a) => {
        const fn = (a.first_name ?? '').toLowerCase()
        const ln = (a.last_name ?? '').toLowerCase()
        const co = (a.company ?? '').toLowerCase()
        return fn.includes(q) || ln.includes(q) || co.includes(q) || `${fn} ${ln}`.includes(q)
      })
      .slice(0, 8)
  }, [openEvent, query, attendees])

  async function handleResolve(eventId: string, attendeeId: string) {
    setBusy(eventId)
    try {
      const res = await fetch(`/api/unmatched-events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', attendee_id: attendeeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed')
        return
      }
      toast.success('Meeting created')
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      setOpenId(null)
      setQuery('')
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function handleDismiss(eventId: string) {
    setBusy(eventId)
    try {
      await fetch(`/api/unmatched-events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      if (openId === eventId) setOpenId(null)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  if (events.length === 0) return null

  return (
    <ul className="space-y-2">
      {events.map((evt) => {
        const isOpen = openId === evt.id
        const dateStr = new Date(evt.start_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
        return (
          <li key={evt.id} className="border rounded-lg p-3 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{evt.summary}</p>
                <p className="text-xs text-muted-foreground">{dateStr}{evt.location && ` · ${evt.location}`}</p>
                {evt.candidate_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">No unique attendee matches &lsquo;{evt.candidate_name}&rsquo;</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === evt.id}
                  onClick={() => {
                    if (isOpen) {
                      setOpenId(null)
                      setQuery('')
                    } else {
                      setOpenId(evt.id)
                      setQuery(evt.candidate_name ?? '')
                    }
                  }}
                >
                  {isOpen ? 'Cancel' : 'Assign'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === evt.id}
                  onClick={() => handleDismiss(evt.id)}
                  className="text-muted-foreground"
                >
                  Dismiss
                </Button>
              </div>
            </div>
            {isOpen && (
              <div className="mt-3 space-y-2 pt-3 border-t">
                <Input
                  autoFocus
                  placeholder="Search attendee by name or company"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {suggestions.length > 0 ? (
                  <ul className="space-y-1 max-h-64 overflow-y-auto">
                    {suggestions.map((a) => {
                      const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || '(no name)'
                      return (
                        <li key={a.id}>
                          <button
                            onClick={() => handleResolve(evt.id, a.id)}
                            disabled={busy === evt.id}
                            className="w-full text-left text-sm border rounded-md px-2.5 py-1.5 hover:bg-muted/50 transition-colors disabled:opacity-50"
                          >
                            <p className="font-medium">{name}</p>
                            {a.company && <p className="text-xs text-muted-foreground">{a.company}</p>}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : query.trim() ? (
                  <p className="text-xs text-muted-foreground">No matches.</p>
                ) : null}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
