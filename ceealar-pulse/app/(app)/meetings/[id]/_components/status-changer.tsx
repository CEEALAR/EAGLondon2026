'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { MeetingStatus } from '@/lib/types'

interface StatusChangerProps {
  meetingId: string
  currentStatus: MeetingStatus
  isOwner: boolean
  isIcal?: boolean
}

const STATUS_LABELS: Record<MeetingStatus, string> = {
  want_to_meet: 'Want to Meet',
  planned:      'Planned',
  done:         'Done',
  no_show:      'No Show',
  cancelled:    'Cancelled',
}

const STATUS_CLASSES: Record<MeetingStatus, string> = {
  want_to_meet: 'bg-amber-50 text-amber-800 border-amber-200',
  planned:      'bg-teal-50 text-teal-800 border-teal-200',
  done:         'bg-emerald-50 text-emerald-800 border-emerald-200',
  no_show:      'bg-gray-50 text-gray-500 border-gray-200',
  cancelled:    'bg-gray-50 text-gray-400 border-gray-200 line-through',
}

const STATUS_DOTS: Record<MeetingStatus, string> = {
  want_to_meet: 'bg-amber-500',
  planned:      'bg-[var(--color-teal)]',
  done:         'bg-emerald-500',
  no_show:      'bg-gray-400',
  cancelled:    'bg-gray-300',
}

export function StatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_CLASSES[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status]}`} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  )
}

export function StatusChanger({ meetingId, currentStatus, isOwner, isIcal = false }: StatusChangerProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  async function changeStatus(newStatus: MeetingStatus) {
    // Confirm destructive state changes
    if (['done', 'no_show', 'cancelled'].includes(newStatus)) {
      const label = STATUS_LABELS[newStatus]
      const confirmed = window.confirm(
        `Are you sure you want to mark this meeting as "${label}"? This cannot be undone.`
      )
      if (!confirmed) return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (!isOwner) {
    return null  // badge is rendered inline with the section heading
  }

  // Owner-only action buttons based on current state
  const actionButtons: React.ReactNode[] = []

  if (currentStatus === 'want_to_meet') {
    actionButtons.push(
      <Button
        key="plan"
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={() => changeStatus('planned')}
      >
        Mark as Planned
      </Button>
    )
  }

  if (currentStatus === 'planned') {
    actionButtons.push(
      <Button
        key="done"
        size="sm"
        variant="default"
        disabled={saving}
        onClick={() => changeStatus('done')}
      >
        Mark as Done
      </Button>,
      <Button
        key="noshow"
        size="sm"
        variant="outline"
        disabled={saving}
        onClick={() => changeStatus('no_show')}
      >
        No Show
      </Button>,
    )
    if (!isIcal) {
      actionButtons.push(
        <Button
          key="cancel"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => changeStatus('cancelled')}
        >
          Cancel Meeting
        </Button>
      )
    }
  }

  if (currentStatus === 'want_to_meet' || currentStatus === 'planned') {
    // Allow marking as done from want_to_meet too (impromptu meeting)
    if (currentStatus === 'want_to_meet') {
      actionButtons.push(
        <Button
          key="done-direct"
          size="sm"
          variant="default"
          disabled={saving}
          onClick={() => changeStatus('done')}
        >
          Mark as Done
        </Button>
      )
    }
  }

  if (actionButtons.length === 0) return null

  return <div className="flex flex-wrap gap-2">{actionButtons}</div>
}
