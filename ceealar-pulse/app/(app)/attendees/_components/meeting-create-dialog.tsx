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
  wantToMeetOwners: string[]
}

export function MeetingCreateDialog({
  attendeeId,
  attendeeName,
  currentUserId,
  teamMembers,
  wantToMeetOwners,
}: MeetingCreateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [status, setStatus] = useState<MeetingStatus>('want_to_meet')
  const [scheduledAt, setScheduledAt] = useState('')
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
          duration_minutes: showTimeFields && scheduledAt ? 30 : null,
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
          {/* SCHED-05: warn if another team member wants to meet this person */}
          {wantToMeetOwners.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="text-amber-500 text-sm">⚠</span>
              <p className="text-xs text-amber-800">
                {wantToMeetOwners.join(', ')}{' '}
                {wantToMeetOwners.length === 1 ? 'wants' : 'want'} to meet this person too.
              </p>
            </div>
          )}
          {/* Owner — native select avoids shadcn value-display bug */}
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

          {/* Date + time — :00 and :30 only */}
          {showTimeFields && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Date &amp; Time</label>
              <Input
                type="datetime-local"
                step={1800}
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">All meetings are 30 minutes.</p>
            </div>
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
