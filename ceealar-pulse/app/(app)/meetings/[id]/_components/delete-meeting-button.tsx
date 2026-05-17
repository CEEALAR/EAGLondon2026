'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteMeetingButton({
  meetingId,
  attendeeId,
  isIcal = false,
}: {
  meetingId: string
  attendeeId: string
  isIcal?: boolean
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const label = isIcal ? 'Delete from Pulse' : 'Delete'
  const confirmMsg = isIcal
    ? 'Delete this meeting from Pulse only? The Swapcard event will stay. Your notes and action items will be lost. (If you also want to cancel the Swapcard meeting, do that in Swapcard — the next sync will mark it cancelled here.)'
    : 'Delete this meeting? This cannot be undone.'

  async function handleDelete() {
    if (!window.confirm(confirmMsg)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        toast.error(`Could not delete: ${text}`)
        return
      }
      toast.success('Meeting deleted')
      router.push(`/attendees/${attendeeId}`)
    } catch (err) {
      toast.error(`Error: ${String(err)}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      disabled={deleting}
      onClick={handleDelete}
    >
      <Trash2 size={14} className="mr-1" />
      {deleting ? 'Deleting…' : label}
    </Button>
  )
}
