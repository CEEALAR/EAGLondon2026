'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface FollowUpDateProps {
  meetingId: string
  initialDate: string | null
}

export function FollowUpDate({ meetingId, initialDate }: FollowUpDateProps) {
  const [date, setDate] = useState(initialDate ?? '')
  const [saved, setSaved] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setDate(value)
    await fetch(`/api/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follow_up_date: value || null }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Follow-up Date</label>
        {saved && <span className="text-xs text-green-600">Saved</span>}
      </div>
      <Input
        type="date"
        value={date}
        onChange={handleChange}
        className="max-w-xs"
      />
    </div>
  )
}
