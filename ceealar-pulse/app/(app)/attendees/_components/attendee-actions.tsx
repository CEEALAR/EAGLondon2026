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
  /**
   * Pre-existing want_to_meet meeting owned by the current user for this
   * attendee, if any. When non-null, the button shows a persistent "On your
   * list" state and clicking it removes the meeting instead of adding.
   */
  existingWantToMeet: { id: string } | null
}

/**
 * Primary attendee actions:
 *   1. "Schedule in Swapcard" — opens Swapcard in a new tab (the actual
 *      booking happens there; iCal sync brings the meeting back to Pulse)
 *   2. "Want to meet" — toggles a want_to_meet Pulse record for the current
 *      user. Idempotent: knows whether a row already exists and acts accordingly.
 */
export function AttendeeActions({
  attendeeId,
  swapcardUrl,
  currentUserId,
  existingWantToMeet,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const isSynthetic = swapcardUrl.startsWith('synthetic://')
  const isOnList = !!existingWantToMeet

  async function handleAdd() {
    setBusy(true)
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
      if (!res.ok) throw new Error(await res.text())
      toast.success('Added to your Want to Meet list')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!existingWantToMeet) return
    if (!confirm('Remove from your Want to Meet list?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/meetings/${existingWantToMeet.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Removed from Want to Meet')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove')
    } finally {
      setBusy(false)
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
        variant={isOnList ? 'default' : 'outline'}
        size="sm"
        onClick={isOnList ? handleRemove : handleAdd}
        disabled={busy}
        className={`h-9 ${isOnList ? 'bg-[var(--color-teal)]/10 text-[var(--color-teal)] border border-[var(--color-teal)]/30 hover:bg-[var(--color-teal)]/15' : ''}`}
        title={isOnList ? 'On your Want to Meet list — click to remove' : 'Add to your Want to Meet list'}
      >
        {busy ? (
          <Loader2 size={14} className="mr-1.5 animate-spin" />
        ) : isOnList ? (
          <Check size={14} className="mr-1.5" />
        ) : null}
        {isOnList ? 'On your list' : 'Want to meet'}
      </Button>
    </>
  )
}
