'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil } from 'lucide-react'
import type { TeamMember } from '@/lib/types'

interface EditMeetingButtonProps {
  meetingId: string
  currentOwnerId: string | null
  currentScheduledAt: string | null
  currentLocation: string | null
  currentUserId: string
  teamMembers: TeamMember[]
}

export function EditMeetingButton({
  meetingId,
  currentOwnerId,
  currentScheduledAt,
  currentLocation,
  currentUserId,
  teamMembers,
}: EditMeetingButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Format ISO string for datetime-local input (strips seconds/ms)
  const toInputValue = (iso: string | null) =>
    iso ? iso.slice(0, 16) : ''

  const [ownerId, setOwnerId] = useState(currentOwnerId ?? currentUserId)
  const [scheduledAt, setScheduledAt] = useState(toInputValue(currentScheduledAt))
  const [location, setLocation] = useState(currentLocation ?? '')

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: ownerId,
          scheduled_at: scheduledAt || null,
          duration_minutes: scheduledAt ? 30 : null,
          location: location || null,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        toast.error(`Could not save: ${text}`)
        return
      }
      toast.success('Meeting updated')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(`Error: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Pencil size={14} className="mr-1" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Owner */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Meeting Owner</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name ?? m.email}{m.id === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date + time */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Date &amp; Time (optional)</label>
              <Input
                type="datetime-local"
                step={1800}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">All meetings are 30 minutes. Clear to mark as unscheduled.</p>
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Location (optional)</label>
              <Input
                placeholder="e.g. Hall B, Table 4"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" className="flex-1" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
