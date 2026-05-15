'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function DeleteMeetingButton({
  meetingId,
  attendeeId,
}: {
  meetingId: string
  attendeeId: string
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Delete this meeting? This cannot be undone.')) return
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
      {deleting ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
