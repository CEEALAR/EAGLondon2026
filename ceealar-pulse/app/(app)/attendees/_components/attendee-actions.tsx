'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  attendeeId: string
  swapcardUrl: string
  currentUserId: string
}

/**
 * Primary attendee actions:
 *   1. "Schedule in Swapcard" — opens Swapcard in a new tab (the actual
 *      booking happens there; iCal sync brings the meeting back to Pulse)
 *   2. "Want to Meet" — one-click creates a want_to_meet Pulse record for
 *      the current user. No dialog.
 */
export function AttendeeActions({ attendeeId, swapcardUrl, currentUserId }: Props) {
  const router = useRouter()
  const [wantState, setWantState] = useState<'idle' | 'saving' | 'done'>('idle')

  const isSynthetic = swapcardUrl.startsWith('synthetic://')

  async function handleWantToMeet() {
    setWantState('saving')
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendee_id: attendeeId,
          owner_id: currentUserId,
          status: 'want_to_meet',
          scheduled_at: null,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        toast.error(`Couldn't add: ${text}`)
        setWantState('idle')
        return
      }
      toast.success('Added to your Want to Meet list')
      setWantState('done')
      router.refresh()
      setTimeout(() => setWantState('idle'), 2200)
    } catch (e) {
      toast.error(`Error: ${String(e)}`)
      setWantState('idle')
    }
  }

  return (
    <>
      {!isSynthetic && (
        <a
          href={swapcardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[var(--color-teal)] text-white text-sm font-medium hover:bg-[var(--color-teal-deep)] transition-colors shadow-sm"
        >
          Schedule in Swapcard
          <ExternalLink size={13} />
        </a>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleWantToMeet}
        disabled={wantState !== 'idle'}
        className="h-9"
      >
        {wantState === 'saving' && (
          <Loader2 size={14} className="mr-1.5 animate-spin" />
        )}
        {wantState === 'done' && (
          <Check size={14} className="mr-1.5 text-[var(--color-teal)]" />
        )}
        {wantState === 'done' ? 'Added' : 'Want to meet'}
      </Button>
    </>
  )
}
