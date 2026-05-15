'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'

interface MeetingNotesFormProps {
  meetingId: string
  isOwner: boolean
  initialValues: {
    prep_note: string | null
    summary: string | null
    meeting_notes: string | null
    comments: string | null
  }
}

interface FieldProps {
  label: string
  value: string
  onSave: (value: string) => Promise<void>
}

function AutosaveTextarea({ label, value: initialValue, onSave }: FieldProps) {
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
        {saved && (
          <span className="text-xs text-green-600">Saved</span>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        rows={4}
        placeholder={`Enter ${label.toLowerCase()}…`}
        className="resize-none"
      />
    </div>
  )
}

export function MeetingNotesForm({ meetingId, isOwner, initialValues }: MeetingNotesFormProps) {
  async function save(field: string, value: string) {
    await fetch(`/api/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <AutosaveTextarea
          label="Prep Note (private until meeting is done)"
          value={initialValues.prep_note ?? ''}
          onSave={(v) => save('prep_note', v)}
        />
      )}
      <AutosaveTextarea
        label="Summary"
        value={initialValues.summary ?? ''}
        onSave={(v) => save('summary', v)}
      />
      <AutosaveTextarea
        label="Meeting Notes"
        value={initialValues.meeting_notes ?? ''}
        onSave={(v) => save('meeting_notes', v)}
      />
      <AutosaveTextarea
        label="Comments"
        value={initialValues.comments ?? ''}
        onSave={(v) => save('comments', v)}
      />
    </div>
  )
}
