'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface MeetingNotesFormProps {
  meetingId: string
  initialValues: {
    why_relevant: string | null
    talking_points: string | null
    meeting_notes: string | null
    comments: string | null
  }
}

interface FieldProps {
  label: string
  value: string
  placeholder?: string
  onSave: (value: string) => Promise<void>
}

function AutosaveTextarea({ label, value: initialValue, placeholder, onSave }: FieldProps) {
  const [value, setValue] = useState(initialValue)
  const [saved, setSaved] = useState(false)

  async function handleBlur() {
    if (value === initialValue) return
    await onSave(value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {saved && <span className="text-xs text-green-600">Saved</span>}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        rows={4}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}…`}
        className="resize-none"
      />
    </div>
  )
}

export function MeetingNotesForm({ meetingId, initialValues }: MeetingNotesFormProps) {
  async function save(field: string, value: string) {
    await fetch(`/api/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  return (
    <div className="space-y-4">
      <AutosaveTextarea
        label="Why they matter"
        value={initialValues.why_relevant ?? ''}
        placeholder="Strategic context — why CEEALAR should care about this person…"
        onSave={(v) => save('why_relevant', v)}
      />
      <AutosaveTextarea
        label="How to engage"
        value={initialValues.talking_points ?? ''}
        placeholder="Specific things to bring up — questions, asks, intros, framings…"
        onSave={(v) => save('talking_points', v)}
      />
      <AutosaveTextarea
        label="Meeting Notes"
        value={initialValues.meeting_notes ?? ''}
        onSave={(v) => save('meeting_notes', v)}
      />
      <AutosaveTextarea
        label="Comments, impressions, notes about the person"
        value={initialValues.comments ?? ''}
        placeholder="Personal observations, vibes, things to remember for next time…"
        onSave={(v) => save('comments', v)}
      />
    </div>
  )
}
