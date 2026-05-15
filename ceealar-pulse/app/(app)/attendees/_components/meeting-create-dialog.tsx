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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TeamMember, MeetingStatus } from '@/lib/types'

interface MeetingCreateDialogProps {
  attendeeId: string
  attendeeName: string
  currentUserId: string
  teamMembers: TeamMember[]
}

export function MeetingCreateDialog({
  attendeeId,
  attendeeName,
  currentUserId,
  teamMembers,
}: MeetingCreateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [status, setStatus] = useState<MeetingStatus>('want_to_meet')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [location, setLocation] = useState('')

  const showTimeFields = status === 'planned'

  async function handleSubmit(overrideStatus?: MeetingStatus) {
    setSaving(true)
    try {
      const finalStatus = overrideStatus ?? status
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendee_id: attendeeId,
          owner_id: ownerId,
          status: finalStatus,
          scheduled_at: showTimeFields && scheduledAt ? scheduledAt : null,
          duration_minutes:
            showTimeFields && durationMinutes ? parseInt(durationMinutes, 10) : null,
          location: location || null,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        toast.error(`Failed to create meeting: ${text}`)
        return
      }

      toast.success('Meeting created')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(`Error: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="default" onClick={() => setOpen(true)}>Schedule Meeting</Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Meeting with {attendeeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Owner */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Meeting Owner</label>
            <Select value={ownerId} onValueChange={(v) => { if (v) setOwnerId(v) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name ?? m.email}
                    {m.id === currentUserId ? ' (you)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as MeetingStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want_to_meet">Want to Meet</SelectItem>
                <SelectItem value="planned">Planned (with time)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date + time — only when planned */}
          {showTimeFields && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Date &amp; Time</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  placeholder="30"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
            </>
          )}

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

        {/* Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            disabled={saving}
            onClick={() => handleSubmit('want_to_meet')}
          >
            Want to Meet
          </Button>
          <Button
            variant="default"
            className="flex-1"
            disabled={saving}
            onClick={() => handleSubmit()}
          >
            {saving ? 'Saving…' : 'Save Meeting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
